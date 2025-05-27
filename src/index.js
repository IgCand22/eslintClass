// StarWars API Code
// This code intentionally violates clean code principles for refactoring practice

const http = require("http");
const https = require("https");
const process = require("process");

const cache = {};
let debug_mode = true;
let timeout = 5000;
let err_count = 0;
const HTTP_CLIENT_ERROR = 400;

async function fetchData(apiPath) {
    cacheTest(apiPath);
    return new Promise((resolve, reject) => {
        let data = " ";
        const request = https.get(`https://swapi.dev/api/${apiPath}`, { rejectUnauthorized: false }, (response) => {
            const errorTest = errorCounterIncreaser(response, reject, HTTP_CLIENT_ERROR);
            if (errorTest) {
                err_count++;
                return reject(errorTest);
            }
            response.on("data", (chunk) => { data += chunk; });
            response.on("end", () => {
                try {
                    dataConverter(data, resolve, reject, apiPath);
                } catch (error) {
                    err_count++;
                    reject(error);
                }
            });
            return undefined;
        }).on("error", (error) => {
            err_count++;
            reject(error);
        });
        setupRequestTimeout(request, reject, apiPath);
    });
}

// Global variables for tracking state
let lastId = 1;
let fetch_count = 0;
let total_size = 0;

async function printData() {
    try {
        if (debug_mode) console.log("Starting data fetch...");
        fetch_count++;
        const character = await fetchData(`people/${  lastId}`);
        characterInfo(character);
        const starshipData = await fetchData("starships/?page=1");
        total_size += JSON.stringify(starshipData).length;
        console.log("\nTotal Starships:", starshipData.count);
        const MAX_STARSHIPS = 3;
        starshipsCounter(MAX_STARSHIPS, starshipData);
        const POPULATION_THRESHOLD = 1_000_000_000;
        const DIAMETER_THRESHOLD = 10_000;
        const planetsData = await fetchData("planets/?page=1");
        planetPopulationTest(POPULATION_THRESHOLD, DIAMETER_THRESHOLD, planetsData);
        const films = await fetchData("films/");
        moviesOrganazier(films);
        vehicleInfo();
        printStats(debug_mode);
        
    } catch (error) {
        console.error("Error:", error.message);
        err_count++;
    }
}

// Process command line arguments
const ARG_START_INDEX = 2;
const args = process.argv.slice(ARG_START_INDEX);
if (args.includes("--no-debug")) {
    debug_mode = false;
}
if (args.includes("--timeout")) {
    const index = args.indexOf("--timeout");
    if (index < args.length - 1) {
        timeout = parseInt(args[index + 1]);
    }
}

// Create a simple HTTP server to display the results
const STATUS_OK = 200;
const STATUS_NOT_FOUND = 404;
const DEFAULT_PORT = 3000;
const html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Star Wars API Demo</title>
                    <style>
                        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                        h1 { color: #FFE81F; background-color: #000; padding: 10px; }
                        button { background-color: #FFE81F; border: none; padding: 10px 20px; cursor: pointer; }
                        .footer { margin-top: 50px; font-size: 12px; color: #666; }
                        pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <h1>Star Wars API Demo</h1>
                    <p>This page demonstrates fetching data from the Star Wars API.</p>
                    <p>Check your console for the API results.</p>
                    <button onclick="fetchData()">Fetch Star Wars Data</button>
                    <div id="results"></div>
                    <script>
                        function fetchData() {
                            document.getElementById('results').innerHTML = '<p>Loading data...</p>';
                            fetch('/api')
                                .then(res => res.text())
                                .then(text => {
                                    alert('API request made! Check server console.');
                                    document.getElementById('results').innerHTML = 
                                          '<p>Data fetched! Check server console.</p>';
                                })
                                .catch(err => {
                                    document.getElementById('results').innerHTML = '<p>Error: ' + err.message + '</p>';
                                });
                        }
                    </script>
                    <div class="footer">
                        <p>API calls: ${fetch_count} | 
                        Cache entries: ${Object.keys(cache).length} | 
                        Errors: ${err_count}</p>
                        <pre>Debug mode: ${debug_mode ? "ON" : "OFF"} | Timeout: ${timeout}ms</pre>
                    </div>
                </body>
            </html>
        `
        ;

const server = http.createServer((request, response) => {
    if (request.url === "/" || request.url === "/index.html") {
        response.writeHead(STATUS_OK, { "Content-Type" : "text/html" });
        response.end(html);
    } else if (request.url === "/api") {
        printData();
        response.writeHead(STATUS_OK, { "Content-Type" : "text/plain" });
        response.end("Check server console for results");
    } else if (request.url === "/stats") {
        response.writeHead(STATUS_OK, { "Content-Type" : "application/json" });
        response.end(JSON.stringify({
            api_calls: fetch_count,
            cache_size: Object.keys(cache).length,
            data_size: total_size,
            errors: err_count,
            debug: debug_mode,
            timeout: timeout
        }));
    } else {
        response.writeHead(STATUS_NOT_FOUND, { "Content-Type" : "text/plain" });
        response.end("Not Found");
    }
});

const PORT = process.env.PORT || DEFAULT_PORT;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log("Open the URL in your browser and click the button to fetch Star Wars data");
    if (debug_mode) {
        console.log("Debug mode: ON");
        console.log("Timeout:", timeout, "ms");
    }
}); 

function cacheTest(apiPath) {
    if (cache[apiPath]) {
        if (debug_mode) console.log("Using cached data for", apiPath);
        return cache[apiPath];
    }
    return null;
}

function errorCounterIncreaser(responseCode, reject, HTTPErrorCode) {
    
    if (responseCode.statusCode >= HTTPErrorCode) {
        return reject((`Request failed with status code ${responseCode.statusCode}`));
    }
    return null;
}

function dataConverter(data, resolve, reject,apiPath) {
    try {
        const processedData = JSON.parse(data);
        cache[apiPath] = processedData;
        resolve(processedData);
        if (debug_mode) {
            console.log(`Successfully fetched data for ${apiPath}`);
            console.log(`Cache size: ${Object.keys(cache).length}`);
        }
    } catch (error) {
        err_count++;
        reject(error);
    }
}

function setupRequestTimeout(request, reject, apiPath) {
    request.setTimeout(timeout, () => {
        timeOutSetterActions(request, reject, apiPath);
    });
}

function timeOutSetterActions(request, reject, apiPath) {
    request.abort();
    err_count++;
    reject(new Error(`Request timeout for ${apiPath}`));
}

function starshipsCounter(MAX_STARSHIPS, starshipData) {
    for (let i = 0; i < MAX_STARSHIPS; i++) {
        const starship = starshipData.results[i];
        starshipTest(i, starshipData);
        if (starship.pilots && starship.pilots.length > 0) {
            console.log("Pilots:", starship.pilots.length);
        }
    }
}

function starshipTest(index, starship) {
    console.log(`Starship ${index + 1}:
    Name: ${starship.name}
    Model: ${starship.model}
    Manufacturer: ${starship.manufacturer}
    Cost: ${starship.cost_in_credits !== "unknown" ? `${starship.cost_in_credits} credits` : "unknown"}
    Speed: ${starship.max_atmosphering_speed}
    Hyperdrive Rating: ${starship.hyperdrive_rating}`);
    
}

function characterInfo(character) {
    total_size += JSON.stringify(character).length;
    console.log(`Character: ${character.name}
    Height: ${character.height}
    Mass: ${character.mass}
    Birthday: ${character.birth_year}`);
    if (character.films && character.films.length > 0) {
        console.log("Appears in", character.films.length, "films");
    }
}

function planetPopulationTest(planetPopulation, planetDiameter, planetsData) {
    total_size += JSON.stringify(planetsData).length;
    console.log("\nLarge populated planets:");
    for (let i = 0; i < planetsData.results.length; i++) {
        const planet = planetsData.results[i];
        knownPlanet(planet, planetPopulation, planetDiameter);
        // Check if it appears in any films
        planetFilmTest(planet);
    }
}

function knownPlanet(planet, planetPopulation, planetDiameter) {
    if (planet.population !== "unknown" && parseInt(planet.population) > planetPopulation && 
        planet.diameter !== "unknown" && parseInt(planet.diameter) > planetDiameter) {
        console.log(planet.name, "- Pop:", planet.population, "- Diameter:", 
            planet.diameter, "- Climate:", planet.climate);
    }
}
    

function planetFilmTest(planet) {
    if (planet.films && planet.films.length > 0) {
        console.log(`  Appears in ${planet.films.length} films`);
    }
}

function moviesOrganazier(films) {
    movieDateOrganizer(films);
}

function movieDateOrganizer(films) {
    total_size += JSON.stringify(films).length;
    const filmList = films.results;
    filmList.sort((filmA, filmB) => {
        return new Date(filmA.release_date) - new Date(filmB.release_date);
    });

    movieChronologicalOrder(filmList);
}

function movieChronologicalOrder(filmList) {
    console.log("\nStar Wars Films in chronological order:");
    for (let i = 0; i < filmList.length; i++) {
        const film = filmList[i];
        console.log(` ${i + 1}. ${film.title} (${film.release_date})
        Director: ${film.director}
        Producer: ${film.producer}
        Characters: ${film.characters.length ?? 0}
        Planets: ${film.planets.length ?? 0}`);
        
    }
}

async function vehicleInfo() {
    const MAX_VEHICLE_ID = 4;
    try{
        if (lastId <= MAX_VEHICLE_ID) {
            const vehicle = await fetchData(`vehicles/${  lastId}`);
            total_size += JSON.stringify(vehicle).length;
            console.log(`Featured Vehicle:
            Name: ${vehicle.name}
            Model: ${vehicle.model}
            Manufacturer: ${vehicle.manufacturer}
            Cost: ${vehicle.cost_in_credits} credits
            Length: ${vehicle.length}
            Crew Required: ${vehicle.crew}
            Passengers: ${vehicle.passengers}`);
            lastId++;  // Increment for next call
        }
    }catch (error) {
        console.log("mesangem de erro");
        console.error("Error:", error);
        err_count++;
    }
}

function printStats(debug_mode) {
    if (debug_mode) {
        console.log(`Stats:
        API Calls: ${fetch_count}
        Cache Size: ${Object.keys(cache).length}
        Total Data Size: ${total_size} bytes
        Error Count: ${err_count}`);
    }
}
