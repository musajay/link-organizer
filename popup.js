const saveButtonEl = document.getElementById("saveButton");
const categorySelectEl = document.getElementById("categorySelect");
const statusEl = document.getElementById("status");
const linkListEl = document.getElementById("linkList");
const filterSelectEl = document.getElementById("filterSelect")
const newCategoryInputEl = document.getElementById("newCategoryInput");
const categorySaveButtonEl = document.getElementById("categorySaveButton")
const sortSelectEl = document.getElementById("sortSelect")
const exportLinksBtnEl = document.getElementById("exportLinksBtn")
const importFileInputEl = document.getElementById("importFileInput")
const openDashboardBtnEl = document.getElementById("openDashboardBtn")


//listener to open link organizer dashboard page
openDashboardBtnEl.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html")})
})

//load categories function
async function loadCategories() {
    try {

    
    const result = await chrome.storage.local.get(["categories"])
        const categories = result.categories || ["work", "personal", "reading"]

        const optionsHtml = categories.map((category) => {
            return `<option value="${category}">${category}</option>`;
        }).join("");

        categorySelectEl.innerHTML = optionsHtml;
        filterSelectEl.innerHTML = `<option value="all">All</option>` + optionsHtml;
    
    }
    catch(error){
        console.log(error)
        statusEl.textContent = "Unable to load your categories"
    }
}

loadCategories();

//function for migrating and assigning ID to links without one
async function adMissingIds(){
    try{
        
        const result= await chrome.storage.local.get(['links'])
        const links = result.links || []

        const withIds = links.map((link) => {
            return {...link, id: link.id || crypto.randomUUID()}
        })

        await chrome.storage.local.set({links: withIds})
    
    } catch(error){
        console.log(error)
    }
}

//async function to wait on adMissingIds before lnks render
async function init(){
    await adMissingIds()
    renderLinks()
}

init()

//render saved links function, async with try catch

async function renderLinks (){
    try{

    const result = await chrome.storage.local.get(["links"])
    const links = result.links || [];
    const selectedFilter = filterSelectEl.value

    const filtered = links.filter((link) => {
        return selectedFilter === "all" || link.category === selectedFilter
    })

    const sorted = filtered.sort((a,b) => {
        if(sortSelectEl.value === "ascend"){
            return b.savedAt - a.savedAt;}
        else if(sortSelectEl.value === "descend"){
            return a.savedAt - b.savedAt;
        }else{
            return 0;
        }
        }) 

    const linkHtml = sorted.map((link) => {
         return `<div class="link-row">
            <div class="link-main">
            <a href="${link.url}">${link.title}</a>
            <span class="link-category">${link.category}</span>
            </div>
            <button class="deleteBtn" data-id="${link.id}">✕</button>
            </div>`;
    }).join("");
    linkListEl.innerHTML = linkHtml;

    }catch(error){
        console.log(error);
        statusEl.textContent = "Unable to display your saved links right now"
    }
}

filterSelectEl.addEventListener("change", renderLinks)
sortSelectEl.addEventListener("change", renderLinks)

init();

//redirect to page logic and delete button logic, below isLinkAlive function
//isLinkAlive checks for dead links
/*async function checkLinkStatus(url){
    try{
        const response = await fetch(url)
        if(response.ok){
            return "alive"
        }else{
            return "not-found"
        }
    } catch (error){
        return "Unreachable"
    }

}*/
//tha above function was me trying to add a fetch function check dead linkss


linkListEl.addEventListener("click", (event) => {
    const clickedLink = event.target.closest("a")
    const clickedDelete = event.target.closest(".deleteBtn");

    if (clickedLink) {
        event.preventDefault();//stop pop up itself from navigating
        chrome.tabs.create({ url: clickedLink.href});
    }
    if (clickedDelete) {
        const idToDelete = clickedDelete.dataset.id
         chrome.storage.local.get(["links"], (result) => {
            const links = result.links || []
            const remaining = links.filter((link) => link.id !== idToDelete)
            chrome.storage.local.set({ links: remaining}, () => {
                renderLinks()
            })
            
         })
         };
})

//save button logic
function getCurrentTab() {
     return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true},  (tabs) => {
                resolve(tabs[0]);
        });
    });
};    

saveButtonEl.addEventListener("click", async () => {
    try{
    
    const tab = await getCurrentTab();
    const currentUrl = tab.url;
    const currentTitle = tab.title;
    const selectedCategory = categorySelectEl.value;

    const newLink = {
        id: crypto.randomUUID(),
        url: currentUrl,
        title: currentTitle,
        category: selectedCategory,
        savedAt: Date.now()
    };

    const result = await chrome.storage.local.get(["links"])
    const links = result.links || [];
    const updatedLinks = [...links,newLink];
        
        
    await chrome.storage.local.set({links: updatedLinks});
    statusEl.textContent = "Saved!";
    renderLinks();

    }
    catch(error){
    console.log(error)
    statusEl.textContent = "Unable to save right now"
}    

});

//add category logic
categorySaveButtonEl.addEventListener("click", () =>{
    const newCategory = newCategoryInputEl.value.trim()

    if(newCategory === ""){
        return;
    }

    chrome.storage.local.get(["categories"], (result)=>{
        const categories = result.categories || ["work", "personal", "reading"]
        
        if(categories.some((category) => category.toLowerCase() === newCategory.toLowerCase())){
            return;
        }

        const updatedCategories = [...categories,newCategory];

        chrome.storage.local.set({categories: updatedCategories}, ()=>{
            loadCategories();
            newCategoryInputEl.value = "";
        })
    })
})

//export links logic
async function exportLinks(){
    const result = await chrome.storage.local.get(["links"])
    const links = result.links || []

    const text = JSON.stringify(links, null, 2)
    const blob = new Blob([text], {type: "application/json"})
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "my-links.json"
    a.click()

    URL.revokeObjectURL(url)
}

exportLinksBtnEl.addEventListener("click", exportLinks)

//import event listener
function importLinks(event){
    const file = event.target.files[0]
    if(file === undefined){
        return
    }

    const reader = new FileReader()

    reader.onload = async () => {
        try{
        const linkData = JSON.parse(reader.result)

        //if blocks to check for valid links, first checks if array, second checks if valid array has url and title
        if(!Array.isArray(linkData)){
            statusEl.textContent = "This file doesn't contain a list of links"
            return
        }
        if (!linkData.every( (link)=> typeof link.url === "string" && typeof link.title === "string")
        ){
            statusEl.textContent = "This file doesn't contain a list of links"
            return
        }

        const result = await chrome.storage.local.get(["links"])
        const links = result.links || [];

        const importedWithIds = linkData.map((link) => {
            return {...link, id: crypto.randomUUID()}
        })
        const updatedLinks = [...links,...importedWithIds];
        
        
        await chrome.storage.local.set({links: updatedLinks});
        statusEl.textContent = `Imported ${linkData.length} links`;
        renderLinks();

        }
        catch(error){
            console.log(error)
            statusEl.textContent = "Unable to import that file"
        }
    }

    reader.readAsText(file)
    event.target.value = ""; //lets you pick the same file again later

}

importFileInputEl.addEventListener("change", importLinks)


