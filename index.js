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
        // clearBtn: document.getElementById('clear-modal-btn'), // This button was removed from HTML
        themeToggle: document.getElementById('theme-toggle') // Added theme toggle button
    };

    // App State
    const state = {
        cocktails: [],
        favorites: JSON.parse(localStorage.getItem('favorites')) || [],
        currentDrinks: []
    };

    // Initialize the app
    init();
    applySavedTheme(); // Apply theme on load

    // Event Listeners
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleSearch());
    elements.filter.addEventListener('change', handleFilter);
    elements.randomBtn.addEventListener('click', fetchRandomCocktail);
    elements.closeBtn.addEventListener('click', closeModal);
    // elements.clearBtn?.addEventListener('click', clearModal); // This button was removed from HTML
    window.addEventListener('click', (e) => e.target === elements.modal && closeModal());
    
    // Theme Toggle Event Listener
    elements.themeToggle.addEventListener('click', toggleTheme);

    // Core Functions
    async function init() {
        // Fetch margaritas as the initial set
        await fetchCocktails('margarita');
        // Additionally fetch a cocoa-based cocktail (e.g., searching for 'chocolate')
        await fetchCocktails('chocolate', 'search'); 

        // Removed the favorites hash check, as there's no visible favorites link in your HTML now
        // if (window.location.hash === '#favorites') {
        //     displayCocktails(state.favorites);
        // }
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
                // Fallback for unrecognized types, still performs a search
                url = `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${query}`;
        }

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.drinks?.length > 0) {
                if (type.startsWith('filterBy')) {
                    // For filter endpoints, we often only get ID and thumbnail, so fetch full details
                    const detailedDrinks = await Promise.all(
                        data.drinks.slice(0, 20).map(async ({ idDrink }) => { // Limit to 20 for performance
                            const detailResponse = await fetch(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${idDrink}`);
                            const detailData = await detailResponse.json();
                            return detailData.drinks?.[0] || null;
                        })
                    );
                    state.cocktails = detailedDrinks.filter(Boolean); // Filters out any null entries
                } else {
                    state.cocktails = data.drinks;
                }
                displayCocktails(state.cocktails);
            } else {
                state.cocktails = []; // Clear previous results
                elements.grid.innerHTML = '<p class="info-message">No cocktails found for this selection. Try a different filter or search.</p>';
            }
        } catch (error) {
            console.error('Failed to load cocktails:', error);
            showError('Failed to load cocktails. Please check your internet connection or try again later.');
            state.cocktails = []; // Clear state on error
        }
    }

    function displayCocktails(drinks) {
        state.currentDrinks = drinks;
        if (drinks.length === 0) {
            elements.grid.innerHTML = '<p class="info-message">No cocktails found. Try a different search or filter.</p>';
            return;
        }

        elements.grid.innerHTML = drinks.map(createCocktailCard).join('');
        addCardEventListeners();
    }

    function createCocktailCard(drink) {
        const isFavorited = state.favorites.some(fav => fav.idDrink === drink.idDrink);
        const alcoholicStatus = drink.strAlcoholic || "Unknown"; // Default to "Unknown" if null
        return `
            <div class="cocktail-card" data-id="${drink.idDrink}">
                <img class="cocktail-img" src="${drink.strDrinkThumb}" alt="${drink.strDrink}">
                <div class="cocktail-info">
                    <h3>${drink.strDrink}</h3>
                    <p>${alcoholicStatus}</p>
                    <button class="favorite-btn ${isFavorited ? 'favorited' : ''}"
                            data-id="${drink.idDrink}">
                        ${isFavorited ? '❤ Favorited' : '🤍 Favorite'}
                    </button>
                </div>
            </div>
        `;
    }

    function addCardEventListeners() {
        document.querySelectorAll('.cocktail-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Only show details if the favorite button wasn't clicked
                if (!e.target.classList.contains('favorite-btn')) {
                    showCocktailDetails(card.dataset.id);
                }
            });
        });

        document.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click event from firing
                toggleFavorite(btn.dataset.id);
            });
        });
    }

    async function showCocktailDetails(id) {
        elements.modalContent.innerHTML = '<p class="loading-message">Loading details...</p>';
        elements.modal.style.display = 'flex'; // Use flex to center, not 'block'
        try {
            const response = await fetch(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${id}`);
            const data = await response.json();
            if (data.drinks?.[0]) {
                renderDrinkDetails(data.drinks[0]);
            } else {
                elements.modalContent.innerHTML = '<p class="info-message">Details not found for this cocktail.</p>';
            }
        } catch (error) {
            console.error('Failed to load cocktail details:', error);
            elements.modalContent.innerHTML = '<p class="error">Failed to load cocktail details. Please try again.</p>';
        }
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
                        <button class="favorite-btn ${isFavorited ? 'favorited' : ''}"
                                data-id="${drink.idDrink}">
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

        // Add favorite button listener to the modal's button
        document.querySelector('.drink-details .favorite-btn')?.addEventListener('click', (e) => {
            toggleFavorite(e.target.dataset.id);
            // Update the text and class immediately for the modal button
            const updatedIsFavorited = state.favorites.some(fav => fav.idDrink === e.target.dataset.id);
            e.target.textContent = updatedIsFavorited ? '❤ Favorited' : '🤍 Favorite';
            e.target.classList.toggle('favorited', updatedIsFavorited);
        });
    }

    function getIngredients(drink) {
        const ingredients = [];
        for (let i = 1; i <= 15; i++) {
            const ingredient = drink[`strIngredient${i}`];
            const measure = drink[`strMeasure${i}`];
            // Ensure ingredient is not null, undefined, or empty string
            if (ingredient?.trim()) { 
                ingredients.push({
                    name: ingredient.trim(),
                    measure: measure?.trim() || '', // Use optional chaining and nullish coalescing
                    thumbnail: `https://www.thecocktaildb.com/images/ingredients/${encodeURIComponent(ingredient.trim())}-Small.png`
                });
            }
        }
        return ingredients;
    }

    async function toggleFavorite(id) {
        // Find the cocktail from currentDrinks or state.cocktails
        let cocktailToAdd = state.currentDrinks.find(d => d.idDrink === id) || state.cocktails.find(d => d.idDrink === id);

        // If still not found, fetch its details explicitly before adding
        if (!cocktailToAdd) {
            try {
                const response = await fetch(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${id}`);
                const data = await response.json();
                cocktailToAdd = data.drinks?.[0];
                if (!cocktailToAdd) {
                    console.error('Error: Cocktail not found for favoriting. ID:', id);
                    return; // Exit if cocktail details cannot be fetched
                }
            } catch (error) {
                console.error('Error fetching cocktail for favorite:', error);
                return;
            }
        }

        const index = state.favorites.findIndex(fav => fav.idDrink === id);
        if (index === -1) {
            state.favorites.push(cocktailToAdd); // Add to favorites
        } else {
            state.favorites.splice(index, 1); // Remove from favorites
        }

        localStorage.setItem('favorites', JSON.stringify(state.favorites));
        updateFavoriteButtons(id); // Update all relevant favorite buttons
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
        elements.grid.innerHTML = '<p class="loading-message">Applying filter...</p>'; // Loading message

        if (selectedValue === 'all') { // If "All Drinks" is selected
            await fetchCocktails('margarita'); // Or any initial general search
            await fetchCocktails('chocolate', 'search'); // Re-add cocoa on "All Drinks"
        } else if (['alcoholic', 'Non_Alcoholic', 'Optional_Alcohol'].includes(selectedValue)) {
            await fetchCocktails(selectedValue, 'filterByAlcohol');
        } else if (selectedValue.startsWith('category-')) {
            const category = selectedValue.substring('category-'.length);
            await fetchCocktails(category, 'filterByCategory');
        } else if (selectedValue.startsWith('glass-')) {
            const glass = selectedValue.substring('glass-'.length);
            await fetchCocktails(glass, 'filterByGlass');
        }
        // Fallback: If filter value doesn't match a specific API type, search by it
        else {
            await fetchCocktails(selectedValue, 'search');
        }
    }

    async function fetchRandomCocktail() {
        elements.grid.innerHTML = '<p class="loading-message">Fetching random cocktail...</p>';
        try {
            const response = await fetch('https://www.thecocktaildb.com/api/json/v1/1/random.php');
            const data = await response.json();
            if (data.drinks?.[0]) showCocktailDetails(data.drinks[0].idDrink);
            else elements.grid.innerHTML = '<p class="info-message">Could not fetch a random cocktail. Please try again.</p>';
        } catch (error) {
            console.error('Failed to get random cocktail:', error);
            showError('Failed to get random cocktail. Please try again.');
        }
    }

    function closeModal() {
        elements.modal.style.display = 'none';
    }

    // `clearModal` is not strictly needed if the modal content is always replaced by `showCocktailDetails`
    // and the modal closes. I've commented out its usage since you removed the button.
    // function clearModal() {
    //     elements.modalContent.innerHTML = '';
    //     closeModal();
    // }

    function showError(message) {
        console.error(message);
        elements.grid.innerHTML = `<p class="error-message">${message}</p>`;
    }

    // --- Dark/Light Mode Functions ---
    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        updateThemeToggleButton(isDarkMode);
    }

    function applySavedTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            updateThemeToggleButton(true);
        } else {
            // Default to light mode if no preference or 'light' is saved
            document.body.classList.remove('dark-mode'); 
            updateThemeToggleButton(false);
        }
    }

    function updateThemeToggleButton(isDarkMode) {
        if (isDarkMode) {
            elements.themeToggle.innerHTML = '🌙 Dark Mode';
        } else {
            elements.themeToggle.innerHTML = '☀️ Light Mode';
        }
    }
});