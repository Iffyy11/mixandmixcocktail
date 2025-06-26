document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const elements = {
        grid: document.getElementById('cocktail-grid'),
        searchInput: document.getElementById('search'),
        searchBtn: document.getElementById('search-btn'),
        filter: document.getElementById('alcohol-filter'),
        randomBtn: document.getElementById('random-btn'),
        modal: document.getElementById('modal'),
        closeBtn: document.querySelector('.close'),
        modalContent: document.getElementById('modal-details'),
        themeToggle: document.getElementById('theme-toggle')
    };

    // App State
    const state = {
        cocktails: [],
        favorites: JSON.parse(localStorage.getItem('favorites')) || [],
        currentDrinks: []
    };

    // Utility Functions
    const fetchData = async (url, errorMessage = 'Failed to fetch data') => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            return data.drinks || [];
        } catch (error) {
            console.error(`${errorMessage}:`, error);
            showError(`${errorMessage}. Please check your internet connection or try again later.`);
            return [];
        }
    };

    const createElement = (tag, className, textContent = '') => {
        const el = document.createElement(tag);
        if (className) el.className = className;
        el.textContent = textContent;
        return el;
    };

    // Core Functions
    async function init() {
        await Promise.all([
            fetchCocktails('margarita'),
            fetchCocktails('chocolate', 'search')
        ]);
    }

    async function fetchCocktails(query, type = 'search') {
        elements.grid.innerHTML = '<p class="loading-message">Loading cocktails...</p>';
        let url;

        switch (type) {
            case 'search':
                url = `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${query}`;
                break;
            case 'filterByAlcohol':
                url = `https://www.thecocktaildb.com/api/json/v1/1/filter.php?a=${query}`;
                break;
            case 'filterByCategory':
                url = `https://www.thecocktaildb.com/api/json/v1/1/filter.php?c=${query}`;
                break;
            case 'filterByGlass':
                url = `https://www.thecocktaildb.com/api/json/v1/1/filter.php?g=${query}`;
                break;
            default:
                url = `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${query}`;
        }

        const drinksData = await fetchData(url, 'Failed to load cocktails');

        if (type.startsWith('filterBy')) {
            const detailedDrinks = await Promise.all(
                drinksData.slice(0, 20).map(async ({ idDrink }) =>
                    fetchData(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${idDrink}`, `Failed to load details for ${idDrink}`)
                        .then(data => data[0]) // Extract the single drink object
                )
            );
            state.cocktails = detailedDrinks.filter(Boolean);
        } else {
            state.cocktails = drinksData;
        }
        displayCocktails(state.cocktails);
    }

    function displayCocktails(drinks) {
        state.currentDrinks = drinks;
        elements.grid.innerHTML = drinks.length ?
            drinks.map(createCocktailCard).join('') :
            '<p class="info-message">No cocktails found. Try a different search or filter.</p>';
        addCardEventListeners();
    }

    function createCocktailCard(drink) {
        const isFavorited = state.favorites.some(fav => fav.idDrink === drink.idDrink);
        const alcoholicStatus = drink.strAlcoholic || "Unknown";
        return `
            <div class="cocktail-card" data-id="${drink.idDrink}">
                <img class="cocktail-img" src="${drink.strDrinkThumb}" alt="${drink.strDrink}">
                <div class="cocktail-info">
                    <h3>${drink.strDrink}</h3>
                    <p>${alcoholicStatus}</p>
                    <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" data-id="${drink.idDrink}">
                        ${isFavorited ? '❤ Favorited' : '🤍 Favorite'}
                    </button>
                </div>
            </div>
        `;
    }

    function addCardEventListeners() {
        document.querySelectorAll('.cocktail-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('favorite-btn')) {
                    showCocktailDetails(card.dataset.id);
                }
            });
        });

        document.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(btn.dataset.id);
            });
        });
    }

    async function showCocktailDetails(id) {
        elements.modalContent.innerHTML = '<p class="loading-message">Loading details...</p>';
        elements.modal.style.display = 'flex';
        const drinkDetails = await fetchData(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${id}`, 'Failed to load cocktail details');
        drinkDetails[0] ? renderDrinkDetails(drinkDetails[0]) :
            elements.modalContent.innerHTML = '<p class="info-message">Details not found for this cocktail.</p>';
    }

    function renderDrinkDetails(drink) {
        const ingredients = getIngredients(drink);
        const isFavorited = state.favorites.some(fav => fav.idDrink === drink.idDrink);

        elements.modalContent.innerHTML = `
            <div class="drink-details">
                <div class="modal-header">
                    <img class="modal-img" src="${drink.strDrinkThumb}" alt="${drink.strDrink}">
                    <div>
                        <h2 class="modal-title">${drink.strDrink}</h2>
                        <p class="modal-category">${drink.strCategory || 'N/A'} • ${drink.strAlcoholic || 'N/A'}</p>
                        <p><strong>Glass:</strong> ${drink.strGlass || 'N/A'}</p>
                        <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" data-id="${drink.idDrink}">
                            ${isFavorited ? '❤ Favorited' : '🤍 Favorite'}
                        </button>
                    </div>
                </div>

                <div>
                    <h3>Ingredients</h3>
                    <div class="ingredients-list">
                        ${ingredients.map(ing => `
                            <div class="ingredient-item">
                                <img src="${ing.thumbnail}" alt="${ing.name}">
                                <span>${ing.name} ${ing.measure}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div>
                    <h3>Instructions</h3>
                    <p class="instructions">${drink.strInstructions || 'No instructions available.'}</p>
                </div>
            </div>
        `;

        document.querySelector('.drink-details .favorite-btn')?.addEventListener('click', (e) => {
            toggleFavorite(e.target.dataset.id);
            const updatedIsFavorited = state.favorites.some(fav => fav.idDrink === e.target.dataset.id);
            e.target.textContent = updatedIsFavorited ? '❤ Favorited' : '🤍 Favorite';
            e.target.classList.toggle('favorited', updatedIsFavorited);
        });
    }

    function getIngredients(drink) {
        return Array.from({ length: 15 }, (_, i) => {
            const ingredient = drink[`strIngredient${i + 1}`];
            const measure = drink[`strMeasure${i + 1}`];
            return ingredient?.trim() ? {
                name: ingredient.trim(),
                measure: measure?.trim() || '',
                thumbnail: `https://www.thecocktaildb.com/images/ingredients/${encodeURIComponent(ingredient.trim())}-Small.png`
            } : null;
        }).filter(Boolean);
    }

    async function toggleFavorite(id) {
        let cocktailToAdd = state.currentDrinks.find(d => d.idDrink === id) || state.cocktails.find(d => d.idDrink === id);

        if (!cocktailToAdd) {
            const fetchedDrinks = await fetchData(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${id}`, 'Error fetching cocktail for favorite');
            cocktailToAdd = fetchedDrinks[0];
            if (!cocktailToAdd) return console.error('Error: Cocktail not found for favoriting. ID:', id);
        }

        const index = state.favorites.findIndex(fav => fav.idDrink === id);
        index === -1 ? state.favorites.push(cocktailToAdd) : state.favorites.splice(index, 1);

        localStorage.setItem('favorites', JSON.stringify(state.favorites));
        updateFavoriteButtons(id);
    }

    function updateFavoriteButtons(id) {
        const isFavorited = state.favorites.some(fav => fav.idDrink === id);
        document.querySelectorAll(`.favorite-btn[data-id="${id}"]`).forEach(btn => {
            btn.textContent = isFavorited ? '❤ Favorited' : '🤍 Favorite';
            btn.classList.toggle('favorited', isFavorited);
        });
    }

    function handleSearch() {
        const searchTerm = elements.searchInput.value.trim();
        if (searchTerm) fetchCocktails(searchTerm, 'search');
    }

    async function handleFilter() {
        const selectedValue = elements.filter.value;
        elements.grid.innerHTML = '<p class="loading-message">Applying filter...</p>';

        if (selectedValue === 'all') {
            await init(); // Re-run initial fetch to get both margarita and chocolate
        } else if (['alcoholic', 'Non_Alcoholic', 'Optional_Alcohol'].includes(selectedValue)) {
            await fetchCocktails(selectedValue, 'filterByAlcohol');
        } else if (selectedValue.startsWith('category-')) {
            await fetchCocktails(selectedValue.substring('category-'.length), 'filterByCategory');
        } else if (selectedValue.startsWith('glass-')) {
            await fetchCocktails(selectedValue.substring('glass-'.length), 'filterByGlass');
        } else {
            await fetchCocktails(selectedValue, 'search');
        }
    }

    async function fetchRandomCocktail() {
        elements.grid.innerHTML = '<p class="loading-message">Fetching random cocktail...</p>';
        const randomDrink = await fetchData('https://www.thecocktaildb.com/api/json/v1/1/random.php', 'Failed to get random cocktail');
        randomDrink[0] ? showCocktailDetails(randomDrink[0].idDrink) :
            elements.grid.innerHTML = '<p class="info-message">Could not fetch a random cocktail. Please try again.</p>';
    }

    function closeModal() {
        elements.modal.style.display = 'none';
    }

    function showError(message) {
        console.error(message);
        elements.grid.innerHTML = `<p class="error-message">${message}</p>`;
    }

    // --- Dark/Light Mode Functions ---
    function toggleTheme() {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        updateThemeToggleButton(isDarkMode);
    }

    function applySavedTheme() {
        const savedTheme = localStorage.getItem('theme');
        const isDarkMode = savedTheme === 'dark';
        document.body.classList.toggle('dark-mode', isDarkMode);
        updateThemeToggleButton(isDarkMode);
    }

    function updateThemeToggleButton(isDarkMode) {
        elements.themeToggle.innerHTML = isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode';
    }

    // Initialize the app and apply theme
    init();
    applySavedTheme();

    // Event Listeners
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleSearch());
    elements.filter.addEventListener('change', handleFilter);
    elements.randomBtn.addEventListener('click', fetchRandomCocktail);
    elements.closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => e.target === elements.modal && closeModal());
    elements.themeToggle.addEventListener('click', toggleTheme);
});