const KICKSTARTER_URL   = "https://cdn.freecodecamp.org/testable-projects-fcc/data/tree_map/kickstarter-funding-data.json";
const MOVIES_URL        = "https://cdn.freecodecamp.org/testable-projects-fcc/data/tree_map/movie-data.json";
const VIDEOGAMES_URL    = "https://cdn.freecodecamp.org/testable-projects-fcc/data/tree_map/video-game-sales-data.json";

const arrData = 
[{  url:            KICKSTARTER_URL,
    title:          "Kickstarter Pledges",
    description:    "Top 100 Most Pledged Kickstarter Campaigns Grouped By Category"
},
{  url:             MOVIES_URL,
   title:           "Movies Sales",
   description:     "Top 100 Highest Grossing Movies Grouped By Genre"
},
{  url:             VIDEOGAMES_URL,
   title:           "Video Game Sales",
   description:     "Top 100 Most Sold Video Games Grouped by Platform"
}]

let promises = [
    d3.json(arrData[0].url),
    d3.json(arrData[1].url),
    d3.json(arrData[2].url)
    ];

    Promise.all(promises).then(([kickstarter, movies, videogames]) => {

        const treeMap = new TreeMapBuilder(kickstarter, movies, videogames);
        treeMap.makeLayout().drawTreeMap().drawTiles().paintTiles().makeTooltip().handleEvents().makeLegend();

        handleHead(treeMap);
    }).catch(error => {
        throw new Error(error);
    });

    class TreeMapBuilder {
        constructor(kickstarter, movies, videogames) {
            // Setup sizes
            this.treemapMargin      = {top: 10, right: 10, bottom: 100, left: 10};
            this.treemapWidth       = 960;
            this.treemapHeight      = 700;
            this.legendHeight       = 150;

            // Save data
            this.kickstarter        = kickstarter;
            this.movies             = movies;
            this.videogames         = videogames;

            // Default dataset
            this.data = this.videogames;
        }

        makeLayout () {
            this.svg = d3.select("#layout")
                         .append("svg")
                         .attr("id",        "chart")
                         .attr("width",     this.treemapWidth)
                         .attr("height",    this.treemapHeight);

            this.canvas = this.svg
                              .append("g")
                              .attr("transform", `translate( ${this.treemapMargin.left}, ${this.treemapMargin.top} )` );

            return this;
        }

        drawTreeMap () {
            // Construct a root node from hierarchical data
            const root = d3.hierarchy(this.data)
                           .eachBefore((d) => {    // Preorder traversal
                                d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.data.name; 
                            })
                           .sum((d) => { return d.value}) // Here the size of each leave is given in the 'value' field in input data
                           .sort((a, b) => { return b.height - a.height || b.value - a.value; });

            // Calculate coordinates of each element of the hierarchy to create leaves and add to the root element
            this.treemap = d3.treemap()
                             .size([this.treemapWidth, this.treemapHeight - this.legendHeight])
                             .paddingInner(1)
                             (root)

            this.treeLeaves = root.leaves();
            
            return this;
        }

        drawTiles () {
            this.tiles = this.canvas.selectAll("g")
                                    .data(this.treeLeaves)
                                    .enter()
                                    .append("g")
                                    .attr("transform", d => `translate(${d.x0}, ${d.y0})`);

            this.cell = this.tiles.append("rect")
                                  .attr("class",            "tile")
                                  .attr("width",            d => d.x1 - d.x0)
                                  .attr("height",           d => d.y1 - d.y0)
                                  .attr("data-name",        d => d.data.name)
                                  .attr("data-category",    d => d.data.category)
                                  .attr("data-value",       d => d.data.value)
                
            this.cellText = this.tiles.append("text")
                                      .selectAll("tspan")
                                      .data(d => d.data.name.split(/(?=[A-Z][^A-Z])/g))
                                      .enter()
                                      .append("tspan")
                                      .attr("x", 4)
                                      .attr("y", (d, i) => 13 + 10*i)
                                      .text(d => d)
                                      .attr("fill", "white")
                                      .attr("font-size", "8px");

            return this;
        }

        paintTiles () {
            this.colorScale = d3.scaleOrdinal()
                                .range([
                                    "#316395","#dc3912","#ff9900","#109618","#990099","#0099c6","#8b0707",
                                    "#3b3eac","#b82e2e","#994499","#22aa99","#aaaa11","#6633cc","#e67300",
                                  ])
                                .domain(this.videogames.children.map (d => d.name));

            this.cell.attr("fill", d => this.colorScale(d.data.category));

            return this;
        }

        makeTooltip () {
            this.tooltip = d3.select("body")
                             .append("div")
                             .attr("id", "tooltip")
                             .style("opacity", 0);

            return this;
        }

        handleEvents () {
            let _self = this;
            
            this.tiles
                .on("mousemove", function(d) {  
                    console.log("mouseover");    
                    _self.tooltip.style("opacity", .9); 
                    _self.tooltip.html(
                       `Name: ${d.data.name}
                        <br>Category: ${d.data.category} 
                        <br>Value: ${d.data.value}`
                    )
                    .style("left",  (d3.event.pageX + 10) + "px") 
                    .style("top",   (d3.event.pageY - 28) + "px")
                    .attr("data-value", d.data.value);
                })    
                .on("mouseout", function(d) { 
                    _self.tooltip.style("opacity", 0); 
                });

            return this;
        }

        makeLegend () {
            const legendElements = this.treeLeaves
                                   .map( leaf => leaf.data.category )
                                   .filter( ( category, index, arrCategory ) => arrCategory.indexOf( category ) === index );

            const legendEntryWidth  = 150;
            const legendBoxSize     = 20;
            const legendPadding     = 5;
            const legendRows        = 4;
            const textHeight        = 16;

            const legend = this.canvas
                             .append("g")
                             .attr( "id", "legend" )
                             .attr( "transform", "translate( 150, 580 )" )
                             .selectAll("g")
                             .data(legendElements)
                             .enter()
                             .append("g" )
                             .attr("transform", (d, i) => `translate(
                                                    ${legendEntryWidth * Math.floor(i / legendRows)}, 
                                                    ${(legendBoxSize + legendPadding) * (i % legendRows)}
                                                )` );

                  legend.append("rect")
                        .attr("width"   , legendBoxSize)
                        .attr("height"  , legendBoxSize)
                        .attr("class"   , "legend-item")
                        .attr("fill"    , d => this.colorScale( d ) );

                  legend.append("text")
                        .attr("class"   , "legend-text")
                        .attr("x"       , legendBoxSize + legendPadding)
                        .attr("y"       , textHeight)
                        .text(d => d);
                  

            return this;
        }

        updateTreeMap = (dataset) => {
            if (dataset === 'videogames')
                this.data = this.videogames;
            else if (dataset === 'kickstarter')
                this.data = this.kickstarter;
            else
                this.data = this.movies;
    
            // Remove previous displayed chart
            this.canvas.remove();
    
            // Make the new chart
            this.canvas = this.svg
                              .append("g")
                              .attr("transform", `translate( ${this.treemapMargin.left}, ${this.treemapMargin.top} )` );
    
            this.drawTreeMap().drawTiles().paintTiles().makeTooltip().handleEvents().makeLegend();
    
            return this;
            
        }
    }

    
    handleHead = (treeMap) => {
        let title               = document.getElementById('title');
        let description         = document.getElementById('description');
        let videogameLink       = document.getElementById('videogameLink');
        let kickstarterLink     = document.getElementById('kickstarterLink');
        let moviesLink          = document.getElementById('moviesLink');

        // Default header values
        videogameLink.  classList.add('active');
        kickstarterLink.classList.remove('active');
        moviesLink.     classList.remove('active');
        title.innerHTML         = arrData[2].title;
        description.innerHTML   = arrData[2].description;

        setActiveLink = context => {
            if (context === 'videogameLink' || '') {
                videogameLink.  classList.add('active');
                kickstarterLink.classList.remove('active');
                moviesLink.     classList.remove('active');
                treeMap.updateTreeMap('videogames');
                title.innerHTML         = arrData[2].title;
                description.innerHTML   = arrData[2].description;
            }
            else if (context === 'kickstarterLink') {
                kickstarterLink.classList.add('active');
                videogameLink.  classList.remove('active');
                moviesLink.     classList.remove('active');
                treeMap.updateTreeMap('kickstarter');
                title.innerHTML         = arrData[0].title;
                description.innerHTML   = arrData[0].description;
            }
            else {
                moviesLink.     classList.add('active');
                videogameLink.  classList.remove('active');
                kickstarterLink.classList.remove('active');
                treeMap.updateTreeMap('movies');
                title.innerHTML         = arrData[1].title;
                description.innerHTML   = arrData[1].description;
            }
        }

        // Create click events
        videogameLink.addEventListener('click', e => {
            e.preventDefault();
            setActiveLink('videogameLink');
        });
        kickstarterLink.addEventListener('click', e => {
            e.preventDefault();
            setActiveLink('kickstarterLink');
        });
        moviesLink.addEventListener('click', e => {
            e.preventDefault();
            setActiveLink('moviesLink');
        })
    }