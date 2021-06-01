# Visualisierung 2 DOSA

Martin Crepaz & Gabriel Ratschiller

## Multivariate Network Exploration and Presentation: From Detail to Overview via Selections and Aggregations

## Application to visualize flight connections in Europe.

There are three views:
One view to select the month and the edges to display.
One view for the map and the interaction with the map.
One view for the high level information based on the selection in the map.

#### Usage:
**First** select a month using the slider. The data for january 2019 is selected by default.

**Note**: After starting the application, no lines are displayed because no selection on the map has been made yet.

**Second** select which edges should be displayed in the map.
Within edges are all edges where both airports are in the same selection.
Between edges are edges between airports that are in different selections.
Background edges are edges where one airport is in a selection that is selected and the other airport is not.

Next, draw selections over areas that you want to investigate and whose data you want to display. White dots show the airports and colored lines the flight connections.

#### To interact with the map:
To start drawing a selection, click once with the left mouse button, move the mouse (without holding the mouse down) and click a second time when you want to complete the selection.
To delete a selection, click on the 'Delete Selection' button in the selections tab.
Zooming the map as well as the high level graph is possible via the mouse wheel.
Dragging the map and the high level graph is possible by holding the left mouse button and dragging the mouse.

In the high-level view, the selections with the activated edges are displayed in a high-level graph and the associated information about the flights is displayed.
Hovering over the nodes and edges displays the number of flights or airports related to the selections made.

#### Provided dataset (sample):
- 'flightlist_201901': January 2019 - 228964 entries
- 'flightlist_202010': October 2020 - 324985 entries
- 'flightlist_202011': November 2020 - 86448 entries
