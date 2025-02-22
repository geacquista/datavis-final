// Numbers of tracks there are, should be a power of 2
const audioSize = 64;

/**
 * Audio Sound Information
 * Base -> Backbeat
 * Snare -> Song says Win/Won
 * Clap -> Song says Fight/Rah
 * Conga -> Song says Men/Opponents
 * Shaker -> Song has Nonsense
 * Rimshot -> Song has Colors
 * Hi-Hat -> Song has Spelling
 * 
 * Data Stored as Bits: NOCSFW
 * N -> Nonsense
 * O -> Men/Opponents
 * C -> Colors
 * S -> Spelling
 * F -> Fight/Rah
 * W -> Win/Won
 */
let audioData = {}, playingSound = 0, enable = true;

// HTML Data
let svg, legend, conferenceFilter, tropeFilter, dataGlobal, tooltip, mapData = new Object();

//Handle on window load
window.onload = () => {
    loadAudio();
    loadSVGData();
    startVisualization();

    // Initializes audio and gives us permission to play it
    document.getElementById('init').addEventListener('click', _ => {
        document.getElementById('overlay').style.display = 'none';
        document.getElementById('start').style.display = 'none';

        // audioData[playingSound].play();
    });

    // Handles the sound icon in the bottom right
    document.getElementById('sound').addEventListener('click', e => {
        if (enable) {
            e.target.src = 'img/off.png';
            audioData[playingSound].pause();
            enable = false;
        } else {
            e.target.src = 'img/on.png';
            audioData[playingSound].currentTime = 0;
            // audioData[playingSound].play();
            enable = true;
        }
    });
};

/**
 * @param {Object} d 
 * @returns The audio index location based on the booleans provided
 */
function getAudioIndex(d) {
    return (yesNoToInt(d.win_won) | yesNoToInt(d.victory)) |
           ((yesNoToInt(d.rah) | yesNoToInt(d.fight)) << 1) |
           ((yesNoToInt(d.men) | yesNoToInt(d.opponents)) << 4) |
           (yesNoToInt(d.spelling) << 2) |
           (yesNoToInt(d.colors) << 3) |
           (yesNoToInt(d.nonsense) << 5)
}

/**
 * @param {String} b 
 * @returns 1 if 'Yes', otherwise 0
 */
function yesNoToInt(b) {
    return b == 'Yes' ? 1 : 0;
}

/**
 * @param  {...String} strings
 * @returns 'Yes' if one string is also 'Yes', otherwise 'No'
 */
function summation(...strings) {
    for (var s in strings)
        if (strings[s] == 'Yes') return 'Yes';
    return 'No';
}

/**
 * Loads and caches the audio for the client
 */
function loadAudio() {
    for (var i = 0; i < audioSize; i++) {
        var audio = new Audio("./audio/" + i.toString() + ".ogg");
        audio.addEventListener('ended', e => {
            if (enable) {
                e.target.currentTime = 0;
                e.target.play();
                // audioData[playingSound].play();
            }
        }, false);
        audioData[i] = audio;
    }
}

var confs = ['Select a conference', 'Big 12', 'Big Ten', 'Pac-12', 'SEC', 'ACC', 'Independent' ];
var tropes = ['Select a trope', 'Fight/Rah', 'Win/Victory', 'Color', 'Spelling', 'Men/Oponents', 'Nonsense'];


/**
 * Loads the svg data
 */
function loadSVGData() {
    // Set svg

    svg = d3.select('svg')
    .attr("height", 650)
    .attr("width", 1200);

    legend = d3.select(".map-container").append("svg")
        .attr("width", 200)
        .attr("height", 200)
        .attr("class", "legend-container")
        // .attr("border", "1px solid #888")
        .append("g")
        .attr("transform", "translate( 20, 25)");
    // Set map data
    mapData.projection = d3.geoMercator()
        .center([-96, 38])
        .scale(1100)
        .translate([svg.attr('width') / 2, svg.attr('height') / 2]);
    mapData.color = d3.scaleOrdinal()
        .domain(['Big 12', 'Big Ten', 'Pac-12', 'SEC', 'ACC', 'Independent' ])
        .range(['#AE1313', '#4498E2', '#01447F','#FFD500', '#FDF2B8', 'white']);
   
    mapData.size = d3.scaleLinear()
        .domain([1, 100])
        .range([3, 100]);

    d3.select("#conference")
        .selectAll('myOptions') 
            .data(confs)
        .enter()
            .append('option')
        .text(function (d) { return d; }) 
        .attr("value", function (d) { return d; })

    d3.select("#tropes")
        .selectAll('myOptions') 
            .data(tropes)
        .enter()
            .append('option')
        .text(function (d) { return d; }) 
        .attr("value", function (d) { return d; })

}

/**
 * Initializes the visualization
 */
function startVisualization() {
    d3.queue()
        .defer(d3.json, 'https://raw.githubusercontent.com/geacquista/datavis-final/main/states.json')
        .defer(d3.csv, 'https://raw.githubusercontent.com/geacquista/datavis-final/main/fight-songs.csv')
        //./fight-songs.csv
        //./states.json
        .await((error, geo, data) => {
            if (error) throw error;

            dataGlobal = data;
            // Draw Map
            svg.append('g')
                .selectAll('path')
                .data(geo.features.filter(d => d.properties.GEO_ID.includes('US')))
                .enter().append('path')
                    .attr('fill', '#0C7301')
                    .attr('fill-opacity', 0.5)
                    .attr('d', d3.geoPath().projection(mapData.projection))
                    .style('stroke', '#fff')
                    .style('stroke-width', 0)

            // Declare tooltip
            tooltip = d3.select('body')
                .append('div')
                    .attr('id', 'tooltip')
                    .attr('style', 'position: absolute; display: none; padding: 5px; background: whitesmoke; border-radius: 5px; box-shadow: 0 0 5px black;');

            // Add Data Points to Map
            svg.append('g')
                .attr('class', 'circles-g')
                .selectAll('circles')
                .data(data)
                .enter().append('circle')
                    .attr('r', d => mapData.size(d.size / 10000) + 3)
                    .style('fill', d => mapData.color(d.conference))
                    .attr('fill-opacity', 0.9)
                    .attr('stroke', 'whitesmoke')
                    .attr('stroke-width', 1)
                    .attr('transform', d => "translate(" + mapData.projection([d.long, d.lat]) + ")")
                    .on('mouseover', (point, i, nodes) => {
                        tooltip.style('display', 'block');
                        d3.select(nodes[i])
                            .style('r', d => mapData.size(d.size / 10000) + 5)
                            .style('opacity', 1);
                        playingSound = getAudioIndex(point);
                        if(enable){
                            audioData[playingSound].currentTime = 0;
                            audioData[playingSound].play();
                        }
                    })
                    .on('mousemove', d => {
                        tooltip
                            .html("<strong>" + d.school + "</strong><hr>"
                                + "\"" + d.song_name + "\"<br>"
                                + "Writer: " + d.writers + "<br>"
                                + "Year: " + d.year + "<br><br>"
                                + "<strong>Tropes</strong><hr>"
                                + "Win/Victory: " + summation(d.win_won, d.victory) + "<br>"
                                + "Fight/Rah: " + summation(d.fight, d.rah) + "<br>"
                                + "Color: " + d.colors + "<br>"
                                + "Spelling: " + d.spelling + "<br>"
                                + "Men/Opponents: " + summation(d.men, d.opponents) + "<br>"
                                + "Nonsense: " + d.nonsense + "<br>")
                            .style('left', (d3.event.pageX - svg.node().getBoundingClientRect().x + 15) + "px")
                            .style('top', (d3.event.pageY + 15) + "px");
                    })
                    .on('mouseleave', (_, i, nodes) => {
                        tooltip.style('display', 'none');
                        d3.select(nodes[i])
                            .transition(1000)
                                .style('r', d => mapData.size(d.size / 10000) + 3)
                                .style('opacity', 0.7);
                        audioData[playingSound].pause();
                        // playingSound = 0;
                    });
                    generateLegend();
        });

        function updateChart(conffilter='Select a conference', trpFilter='Select a trope') {

            var filterdata = dataGlobal;

            if(conffilter != 'Select a conference') {
                filterdata = filterdata.filter( d => d.conference == conffilter);
            }

            if(trpFilter != "Select a trope") {
                switch (trpFilter) {
                    case "Fight/Rah":
                        filterdata = filterdata.filter( d => (d.fight == "Yes" || d.rah == "Yes"));
                        break;
                    case "Win/Victory": 
                    filterdata = filterdata.filter( d => (d.win_won == "Yes" || d.victory_win_won == "Yes"));
                        break;
                    case "Color":
                        filterdata = filterdata.filter( d => d.colors == "Yes");
                        break;
                    case "Spelling":
                        filterdata = filterdata.filter( d => d.spelling == "Yes" );
                        break;
                    case "Men/Oponents":
                        filterdata = filterdata.filter( d => (d.men == "Yes" || d.opponents == "Yes"));
                        break;
                    case "Nonsense":
                        filterdata = filterdata.filter( d => d.nonsense == "Yes" );
                        break;

                }
            }
            
            svg.select(".circles-g").remove();

            svg.append('g')
            .attr('class', 'circles-g')
            .selectAll('circles')
            .data(filterdata)
            .enter().append('circle')
                .attr('r', d => mapData.size(d.size / 10000) + 3)
                .style('fill', d => mapData.color(d.conference))
                .attr('fill-opacity', 0.9)
                .attr('stroke', 'whitesmoke')
                .attr('stroke-width', 1)
                .attr('transform', d => "translate(" + mapData.projection([d.long, d.lat]) + ")")
                .on('mouseover', (point, i, nodes) => {
                    tooltip.style('display', 'block');
                    d3.select(nodes[i])
                        .style('r', d => mapData.size(d.size / 10000) + 5)
                        .style('opacity', 1);
                    playingSound = getAudioIndex(point);
                    if(enable){
                        audioData[playingSound].currentTime = 0;
                        audioData[playingSound].play();
                    }
                })
                .on('mousemove', d => {
                    tooltip
                        .html("<strong>" + d.school + "</strong><br>"
                            + "\"" + d.song_name + "\"<br>"
                            + "Writer: " + d.writers + "<br>"
                            + "Year: " + d.year + "<br><br>"
                            + "<strong>Tropes</strong><br>"
                            + "Win/Victory: " + summation(d.win_won, d.victory) + "<br>"
                            + "Fight/Rah: " + summation(d.fight, d.rah) + "<br>"
                            + "Color: " + d.colors + "<br>"
                            + "Spelling: " + d.spelling + "<br>"
                            + "Men/Opponents: " + summation(d.men, d.opponents) + "<br>"
                            + "Nonsense: " + d.nonsense + "<br>")
                        .style('left', (d3.event.pageX - svg.node().getBoundingClientRect().x + 15) + "px")
                        .style('top', (d3.event.pageY + 15) + "px");
                })
                .on('mouseleave', (_, i, nodes) => {
                    tooltip.style('display', 'none');
                    d3.select(nodes[i])
                        .transition(1000)
                            .style('r', d => mapData.size(d.size / 10000) + 3)
                            .style('opacity', 0.7);
                    audioData[playingSound].pause();
                    // playingSound = 0;
                });

                if (conffilter != "Select a conference") {
                    generateLegend([conffilter]);
                } else if (trpFilter != "Select a trope" && conffilter == "Select a conference") {
                    generateLegend([... new Set(filterdata.map(d => d.conference))]);
                } else {
                    generateLegend();
                }
        }
    
        d3.select("#conference").on("change", function(d) {
            
            conferencefilter = d3.select(this).property("value")
            updateChart(conferencefilter, tropeFilter)

        });
        d3.select("#tropes").on("change", function(d) {
            
            tropeFilter = d3.select(this).property("value")
            updateChart(conferencefilter, tropeFilter)

        })

        /* code to generate the legend for the map */
        function generateLegend (keys = null) {
            // create a list of keys
            keys = (keys == null) ? ['Big 12', 'Big Ten', 'Pac-12', 'SEC', 'ACC', 'Independent' ] : keys;

            // Add one dot in the legend for each name.
            legend.selectAll(".mydots").remove();
            legend.selectAll(".mylabels").remove();
            legend.selectAll(".mydots")
            .data(keys)
            .enter()
            .append("circle")
            .attr("class", "mydots")
            .attr("cx", 0)
                .attr("cy", function(d,i){ return 0 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
                .attr("r", 7)
                .style("fill", function(d){ return mapData.color(d)});

            legend.selectAll(".mylabels")
            .data(keys)
            .enter()
            .append("text")
            .attr("class", "mylabels")
            .attr("x", 20)
                .attr("y", function(d,i){ return 0 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
                // .style("fill", function(d){ return color(d)})
                .text(function(d){ return d})
                .attr("text-anchor", "left")
                .style("alignment-baseline", "middle");

        }
        
            
}

  
  
