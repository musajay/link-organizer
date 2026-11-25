const listEl = document.getElementById("dashboardList");
const searchInputEl = document.getElementById("searchInput")
const filterSelectEl = document.getElementById("filterSelect")
const sortSelectEl = document.getElementById("sortSelect")

async function loadCategories(){
    const result = await chrome.storage.local.get(["categories"])
    const categories = result.categories || ["work", "personal", "reading"]

    filterSelectEl.textContent =  ""

    const allOption = document.createElement('option')
    allOption.textContent = "All"
    allOption.value = "all"
    filterSelectEl.appendChild(allOption)

    categories.forEach((category) => {
        const optionsEl = document.createElement('option')
        optionsEl.textContent = category
        optionsEl.value = category
        filterSelectEl.appendChild(optionsEl)
    })
}

async function init() {
    await loadCategories()
    renderDashboard()
}

init()

async function renderDashboard(){
    const result = await chrome.storage.local.get(["links"])
    const links = result.links || []

    const searchInputValue = searchInputEl.value.toLowerCase()
    const selectedCategory = filterSelectEl.value
    const sortOrder = sortSelectEl.value

    const filteredSearchLink = links.filter((link)=> {
        const matchesSearch = link.title.toLowerCase().includes(searchInputValue) ||  link.url.toLowerCase().includes(searchInputValue)
        const matchesCategory = selectedCategory === "all" || link.category === selectedCategory

        return matchesSearch && matchesCategory
    })  

    const sortedLinks = filteredSearchLink.sort((a,b) =>{
        if(sortOrder === "newest"){
            return b.savedAt - a.savedAt
        }else if(sortOrder === "oldest"){
            return a.savedAt - b.savedAt
        }
    })

    listEl.textContent = ""//clear after each search input

       if(links.length === 0){
        listEl.textContent = "No links currently saved"
    }
     else if(sortedLinks.length === 0){
        listEl.textContent = "No links match your search"
    }


    sortedLinks.forEach((link) => {
        const row = document.createElement("div")
        const linkEl = document.createElement("a")

        row.className = "link-row"
        linkEl.className = "link-title"

        linkEl.textContent = link.title
        linkEl.href = link.url
        linkEl.target = "_blank"
        linkEl.rel = "noopener noreferrer";

        row.appendChild(linkEl)

        //for css styling below
        const categoryEl = document.createElement("span")
        categoryEl.className = "link-category"
        categoryEl.textContent = link.category
        row.appendChild(categoryEl)

         //delete button icon creation
        const deleteButton = document.createElement("button")
        deleteButton.textContent = "✕"
        deleteButton.className = "deleteBtn"
        row.appendChild(deleteButton)

        deleteButton.addEventListener("click", async () => {
            const stored = await chrome.storage.local.get(["links"])
            const currentLinks = stored.links || []
            const remaining = currentLinks.filter((item) => item.id !== link.id)
            await chrome.storage.local.set({ links: remaining }) 
            renderDashboard()   
        })

        listEl.appendChild(row)

    });
}


sortSelectEl.addEventListener("change", renderDashboard)
filterSelectEl.addEventListener("change", renderDashboard)
searchInputEl.addEventListener("input", renderDashboard);


/*old render before sort and select
async function renderDashboard(){
    const result = await chrome.storage.local.get(["links"])
    const links = result.links || []
    const searchInputValue = searchInputEl.value.toLowerCase()

    const filteredSearchLink = links.filter((link)=> {
        return link.title.toLowerCase().includes(searchInputValue) ||  link.url.toLowerCase().includes(searchInputValue)
    })

    listEl.textContent = ""//clear after each search input

       if(links.length === 0){
        listEl.textContent = "No links currently saved"
    }
     else if(filteredSearchLink.length === 0){
        listEl.textContent = "No links match your search"
    }


    filteredSearchLink.forEach((link) => {
        const row = document.createElement("div")
        const linkEl = document.createElement("a")

        linkEl.textContent = link.title
        linkEl.href = link.url
        linkEl.target = "_blank"
        linkEl.rel = "noopener noreferrer";

        row.appendChild(linkEl)
        listEl.appendChild(row)
    });
} */
