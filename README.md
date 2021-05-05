# Visualisierung 2 DOSA

Martin Crepaz & Gabriel Ratschiller

##Multivariate Network Exploration and Presentation: From Detail to Overview via Selections and Aggregations

##Application to visualize flight connections in Europe.

There are three views:
One view to select the month and the edges to display.
One view for the map and the interaction with the map.
One view for the high level information based on the selection in the map.

####Usage:
**First** select a month. The data for the 1901 (january 2019) month is selected by default. To retrieve the data from different months, the year and the month must be entered in the input field in the format YYMM (“1901” for january 2019).

**Note**: After starting the application, no lines are displayed because no country has been selected yet.

**Second** select what edges have to be displayed in the map.
Within edges are all edges where both airports are in the same country.
Between edges are edges between different countries and where both of these countries are selected.
Background edges are edges where one airport is in a country that is selected and the other not.

Next, click on the countries that you want to investigate and whose data you want to display. Red dots show the airports and yellow lines the flight connections.

####To interact with the map:
To select a country click with the left mouse button on it.
To deselect a country click on the selected country with the left mouse button.
Zooming with the mouse wheel.
Dragging the map by holding the left mouse button and dragging the mouse.

In the high-level view the selected countries and the related information about the flights is displayed. This information is later used to generate a high-level graph as it is in the paper.

####Provided dataset for the demo:
- 1901 (January 2019) - 23491 entries
- 2001 (January 2020) - 133344 entries
- 2101 (January 2021) - 86091 entries

**Our challenge:**

performance optimization (133000 edges slow down the rendering and interaction of the map)