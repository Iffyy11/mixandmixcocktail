document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    grid: document.getElementById('cocktail-grid'),
    searchInput: document.getElementById('search'),
    searchBtn: document.getElementById('search-btn'),
    randomBtn: document.getElementById('random-btn'),
    modal: document.getElementById('modal'),
    closeBtn: document.querySelector('.close'),
    modalContent: document.getElementById('modal-details'),
    themeToggle: document.getElementById('theme-toggle'),
    filter: document.getElementById('alcohol-filter') // ✅ Added filter select
  };

  const state = {
    cocktails: [],
    favorites: JSON.parse(localStorage.getItem('favorites')) || [],
    currentDrinks: []
  };

  const fetchData = async (url, errorMessage = 'Failed to fetch data') => {
    try {
      const res = await fetch(url);
      const data = await res.json();
      return data.drinks || [];
    } catch (err) {
      elements.grid.innerHTML = `<p class="error-message">${errorMessage}</p>`;
      return [];
    }
  };

  const init = async () => {
    await fetchCocktails('Shake');
  };

  const fetchCocktails = async (query, type = 'search') => {
    elements.grid.innerHTML = 'Loading...';
    let url;
    switch (type) {
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

    const drinks = await fetchData(url);
    if (type.startsWith('filterBy')) {
      const detailedDrinks = await Promise.all(drinks.slice(0, 12).map(
        d => fetchData(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${d.idDrink}`).then(d => d[0])
      ));
      state.cocktails = detailedDrinks;
    } else {
      state.cocktails = drinks;
    }

    displayCocktails(state.cocktails);
  };

  const displayCocktails = (drinks) => {
    state.currentDrinks = drinks;
    elements.grid.innerHTML = drinks.length ? drinks.map(createCard).join('') : '<p>No drinks found</p>';
    addCardEvents();
  };

  const createCard = (drink) => {
    const fav = state.favorites.some(f => f.idDrink === drink.idDrink);
    return `
      <div class="cocktail-card" data-id="${drink.idDrink}">
        <img src="${drink.strDrinkThumb}" alt="${drink.strDrink}" />
        <h3>${drink.strDrink}</h3>
        <button class="favorite-btn" data-id="${drink.idDrink}">${fav ? '❤' : '🤍'}</button>
      </div>
    `;
  };

  const addCardEvents = () => {
    document.querySelectorAll('.cocktail-card').forEach(card => {
      const id = card.dataset.id;
      card.querySelector('img').addEventListener('click', () => showDetails(id));
      card.querySelector('.favorite-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(id);
      });
    });
  };

  const showDetails = async (id) => {
    elements.modal.style.display = 'flex';
    elements.modalContent.innerHTML = 'Loading...';
    const data = await fetchData(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${id}`);
    const drink = data[0];
    const ingredients = [];

    for (let i = 1; i <= 15; i++) {
      const ing = drink[`strIngredient${i}`];
      const measure = drink[`strMeasure${i}`];
      if (ing) ingredients.push(`${measure || ''} ${ing}`.trim());
    }

    elements.modalContent.innerHTML = `
      <h2>${drink.strDrink}</h2>
      <img src="${drink.strDrinkThumb}" alt="${drink.strDrink}" />
      <p><strong>Glass:</strong> ${drink.strGlass}</p>
      <p><strong>Instructions:</strong> ${drink.strInstructions}</p>
      <ul>${ingredients.map(i => `<li>${i}</li>`).join('')}</ul>
    `;
  };

  const toggleFavorite = async (id) => {
    let drink = state.currentDrinks.find(d => d.idDrink === id) || state.cocktails.find(d => d.idDrink === id);

    if (!drink) {
      const data = await fetchData(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${id}`);
      drink = data[0];
    }

    const index = state.favorites.findIndex(f => f.idDrink === id);
    if (index > -1) {
      state.favorites.splice(index, 1);
    } else {
      state.favorites.push(drink);
    }

    localStorage.setItem('favorites', JSON.stringify(state.favorites));
    displayCocktails(state.currentDrinks);
  };

  const handleFilter = () => {
    const value = elements.filter.value;
    if (value === 'all') {
      init();
    } else if (['alcoholic', 'Non_Alcoholic', 'Optional_Alcohol'].includes(value)) {
      fetchCocktails(value, 'filterByAlcohol');
    } else if (value.startsWith('category-')) {
      fetchCocktails(value.replace('category-', ''), 'filterByCategory');
    } else if (value.startsWith('glass-')) {
      fetchCocktails(value.replace('glass-', ''), 'filterByGlass');
    }
  };

  const fetchRandomCocktail = async () => {
    const data = await fetchData(`https://www.thecocktaildb.com/api/json/v1/1/random.php`);
    const drink = data[0];
    showDetails(drink.idDrink);
  };

  const toggleTheme = () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    elements.themeToggle.textContent = isDark ? '🌙 Dark Mode' : '☀️ Light Mode';
  };

  const applyTheme = () => {
    const saved = localStorage.getItem('theme');
    const isDark = saved === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    elements.themeToggle.textContent = isDark ? '🌙 Dark Mode' : '☀️ Light Mode';
  };

  // Event Listeners
  elements.searchBtn.addEventListener('click', () => fetchCocktails(elements.searchInput.value));
  elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') fetchCocktails(elements.searchInput.value);
  });
  elements.filter.addEventListener('change', handleFilter);
  elements.randomBtn.addEventListener('click', fetchRandomCocktail);
  elements.closeBtn.addEventListener('click', () => elements.modal.style.display = 'none');
  window.addEventListener('click', (e) => {
    if (e.target === elements.modal) elements.modal.style.display = 'none';
  });
  elements.themeToggle.addEventListener('click', toggleTheme);

  // Start app
  applyTheme();
  init();
});
