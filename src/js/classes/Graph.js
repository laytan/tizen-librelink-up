export default class Graph {
  /**
   * @type {SVGElement}
   */
  svgEl;

  /**
   * Multiplies the amount of radius offset for more movement
   */
  movementMultiplier = 10;

  /**
   * What radius to anchor the line and start offset calculations
   */
  baseLineRadius = 120;
  
  /**
   * The line's value when it is at the baseLineRadius
   */
  baseLineValue = 6.5;

  /**
   * Controls the amount of points to draw
   */
  smoothness = .1;

  /**
   * @param {string} svgId Id of the svg element
   */
  constructor(svgId) {
    this.svgEl = document.getElementById(svgId);
  }

  /**
   * Creates a path element circle
   * used because tizen does not support textPath on circles
   * 
   * @param {number} r Radius
   * @param {string} id Element ID
   * @param {string} color Border color
   * @returns {string}
   */
  circleAsPath(r, id, color) {
    return /*html*/`
      <path
        fill="none"
        stroke="${color}"
        id="${id}"
        d="
        M 180 180
        m ${-r}, 0
        a ${r},${r} 0 1,1 ${r * 2},0
        a ${r},${r} 0 1,1 ${-(r * 2)},0
        "
      />
    `;
  }

  /**
   * Shows a circle on the graph
   *
   * @param {number} radius Circle Radius
   * @param {string} id Circle element id
   * @param {string} color Circle color
   * @param {string} value Text to draw against it
   */
  showCircle(radius, id, color, value) {
    this.svgEl.innerHTML += this.circleAsPath(radius, id, color);
    this.showText(color, id, Math.round(value * 10) / 10, '50%');
  }

  /**
   * Draws text around a path
   *
   * @param {string} color Text color
   * @param {string} aroundId ID of the element to draw against (without #)
   * @param {string} text Text to draw
   * @param {string} startOffset How far on the path to begin drawing
   */
  showText(color, aroundId, text, startOffset = '0%') {
    this.svgEl.innerHTML += /*html*/`
      <text text-anchor="middle" fill="${color}">
        <textPath startOffset="${startOffset}" href="#${aroundId}">${text}</textPath>
      </text>
    `;
  }

  /**
   * Clear all drawn shapes of the svg
   */
  clear() {
    this.svgEl.innerHTML = '';
  }

  /**
   * @param {Array<import("./LibreClient").GraphDataPoint>} points
   * @param {string} name
   */
  show(points, name) {
    const values = points.map(p => p.Value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const avgValue = points.reduce((a, c) => a + c.Value, 0) / points.length;
    this.baseLineValue = avgValue;

    // Set the maximum base line radius we can without overflowing by subtracting the max value of the circle radius
    this.baseLineRadius = 150 - ((maxValue - this.baseLineValue) * this.movementMultiplier);

    // What radius a point will be at with the specified value
    const valueToRadius = (v) => this.baseLineRadius + ((v - this.baseLineValue) * this.movementMultiplier);

    this.showCircle(this.baseLineRadius, 'baseline', 'white', this.baseLineValue);
    this.showCircle(valueToRadius(maxValue), 'max', 'white', maxValue);
    this.showCircle(valueToRadius(minValue), 'min', 'white', minValue);

    let currPoint = 0;
    const linePoints = [];
    const pointsAmt = ((2 * Math.PI) / .1);
    for (let i = 0; i <= 2 * Math.PI; i += .1) {
      // Get the currpoint index scaled to the points given
      let index = Math.round((points.length / pointsAmt) * currPoint);
      // Round might go out of bounds near the end
      if (index >= points.length -1) {
        index = points.length - 1;
      }

      
      // Get modified radius for this value
      const r = valueToRadius(points[index].Value);
      linePoints.push({
          x: 180 + r * Math.cos(i),
          y: 180 + r * Math.sin(i),
      });
      currPoint++;
    }
    
    // Create the d attribute for the svg with all our points
    const pointsAttr = linePoints.reduce((aggr, curr) => {
      return aggr + `${curr.x},${curr.y} `;
    }, 'M');

    this.svgEl.innerHTML += /*html*/`
      <path id="line" fill="none" stroke="blue" stroke-width="3" d="${pointsAttr}"></path>
    `;
    this.showText('white', 'line', name, '15%');
  }
}
