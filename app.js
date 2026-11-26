const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const DEFAULT_CITY = "Pune";

const WEATHER_LABELS = {
  0: "☀️ Clear",
  1: "🌤️ Mostly Clear",
  2: "⛅ Partly Cloudy",
  3: "☁️ Cloudy",
  45: "🌫️ Fog",
  48: "🌫️ Depositing Rime Fog",
  51: "🌦️ Light Drizzle",
  53: "🌦️ Moderate Drizzle",
  55: "🌧️ Dense Drizzle",
  61: "🌧️ Slight Rain",
  63: "🌧️ Moderate Rain",
  65: "⛈️ Heavy Rain",
  71: "❄️ Slight Snow",
  73: "❄️ Moderate Snow",
  75: "❄️ Heavy Snow",
  80: "🌦️ Rain Showers",
  95: "⛈️ Thunderstorm"
};

const formEl = document.querySelector("form");
const inputEl = document.getElementById("search-items");
const buttonEl = document.getElementById("search-btn");
const statusEl = document.getElementById("status");
const currentWeatherEl = document.getElementById("current-weather");
const forecastEl = document.getElementById("forecast");

function getWeatherLabel(code) {
  return WEATHER_LABELS[code] || "🌡️ Unknown Weather";
}

async function findCity(name) {
  const url = `${GEOCODING_URL}?count=1&name=${encodeURIComponent(name)}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("The search service is not responding.");
  }

  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("City not found.");
  }

  const city = data.results[0];
  return {
    name: city.name,
    country: city.country || "",
    lat: city.latitude,
    lon: city.longitude
  };
}

async function getWeather(lat, lon) {
  const url =
    `${FORECAST_URL}?latitude=${lat}&longitude=${lon}` +
    "&current=temperature_2m,weather_code" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
    "&forecast_days=5&timezone=auto";

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Could not load the forecast.");
  }

  return res.json();
}

function renderCurrentWeather(city, weather) {
  currentWeatherEl.textContent = "";

  const titleEl = document.createElement("h2");
  titleEl.className = "city-title";
  titleEl.textContent = city.country ? `${city.name}, ${city.country}` : city.name;

  const tempEl = document.createElement("p");
  tempEl.className = "current-temp";
  const tempVal = weather.current ? weather.current.temperature_2m : "";
  tempEl.textContent = `🌡️ ${tempVal} °C`;

  const conditionEl = document.createElement("p");
  conditionEl.className = "current-condition";
  const codeVal = weather.current ? weather.current.weather_code : null;
  conditionEl.textContent = getWeatherLabel(codeVal);

  currentWeatherEl.append(titleEl, tempEl, conditionEl);
}

function renderForecast(daily) {
  forecastEl.textContent = "";

  if (!daily || !daily.time) return;

  for (let i = 0; i < daily.time.length; i++) {
    const cardEl = document.createElement("article");
    cardEl.className = "forecast-day";

    const dateObj = new Date(daily.time[i]);
    const dateEl = document.createElement("p");
    dateEl.className = "forecast-date";
    dateEl.textContent = dateObj.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric"
    });

    const labelEl = document.createElement("p");
    labelEl.className = "forecast-condition";
    const dayCode = daily.weather_code ? daily.weather_code[i] : null;
    labelEl.textContent = getWeatherLabel(dayCode);

    const maxTemp = daily.temperature_2m_max ? daily.temperature_2m_max[i] : "-";
    const minTemp = daily.temperature_2m_min ? daily.temperature_2m_min[i] : "-";

    const maxEl = document.createElement("p");
    maxEl.className = "forecast-max";
    maxEl.textContent = `🔺 Max: ${maxTemp}°C`;

    const minEl = document.createElement("p");
    minEl.className = "forecast-min";
    minEl.textContent = `🔻 Min: ${minTemp}°C`;

    cardEl.append(dateEl, labelEl, maxEl, minEl);
    forecastEl.appendChild(cardEl);
  }
}

async function handleCitySearch(cityName) {
  const cleanName = cityName.trim();

  if (!cleanName) {
    statusEl.textContent = "Type a city name.";
    currentWeatherEl.textContent = "";
    forecastEl.textContent = "";
    return;
  }

  buttonEl.disabled = true;
  statusEl.textContent = "Loading...";
  currentWeatherEl.textContent = "";
  forecastEl.textContent = "";

  try {
    const city = await findCity(cleanName);
    const weather = await getWeather(city.lat, city.lon);

    renderCurrentWeather(city, weather);
    renderForecast(weather.daily);
    localStorage.setItem("lastCity", city.name);
    statusEl.textContent = "";
  } catch (err) {
    currentWeatherEl.textContent = "";
    forecastEl.textContent = "";
    if (err instanceof TypeError) {
      statusEl.textContent = "Network problem. Please check your connection.";
    } else {
      statusEl.textContent = err.message || "Something went wrong.";
    }
  } finally {
    buttonEl.disabled = false;
  }
}

function loadDefaultCity() {
  handleCitySearch(DEFAULT_CITY);
}

function loadCurrentLocationWeather() {
  if (!("geolocation" in navigator)) {
    loadDefaultCity();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async function (position) {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      buttonEl.disabled = true;
      statusEl.textContent = "Loading current location weather...";

      try {
        const weather = await getWeather(lat, lon);
        renderCurrentWeather(
          { name: "Current Location", country: "" },
          weather
        );
        renderForecast(weather.daily);
        statusEl.textContent = "";
      } catch (err) {
        statusEl.textContent = "";
        loadDefaultCity();
      } finally {
        buttonEl.disabled = false;
      }
    },
    function () {
      statusEl.textContent = "";
      loadDefaultCity();
    }
  );
}

formEl.addEventListener("submit", function (e) {
  e.preventDefault();
  handleCitySearch(inputEl.value);
});

const savedCity = localStorage.getItem("lastCity");
if (savedCity) {
  inputEl.value = savedCity;
  handleCitySearch(savedCity);
} else {
  loadCurrentLocationWeather();
}
