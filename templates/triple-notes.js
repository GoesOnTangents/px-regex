import Morph from "./Morph.js"

import d3 from 'src/external/d3.v4.js';

import { Graph } from 'src/client/triples/triples.js';
import * as drawTools from 'src/client/triples/drawTools.js';

const MIN_MAGNIFICATION = 0.01;
const MAX_MAGNIFICATION = 4;

const NODE_BY_KNOT = new Map();
function getNodeByKnot(knot) {
  if(!NODE_BY_KNOT.has(knot)) {
    NODE_BY_KNOT.set(knot, new Node(knot));
  }
  return NODE_BY_KNOT.get(knot);
}

class Node {
  constructor(knot, label) {
    this.knot = knot;
    //this.r = ~~d3.randomUniform(8, 28)();
  }
  label() {
    return this.knot.label();
  }
  isTriple() {
    return this.knot.isTriple();
  }
  getKnot() { return this.knot; }
  
  draw(parentElement, additionalCssClasses) {
		var cssClasses = [];// that.collectCssClasses();

		//that.nodeElement(parentElement);

		//if (additionalCssClasses instanceof Array) {
		//	cssClasses = cssClasses.concat(additionalCssClasses);
		//}

		drawTools.appendCircularClass(parentElement, 40, cssClasses, this.label(), 'lightblue');

		//that.postDrawActions(parentElement);
	}
}

class Link extends Node {
  constructor(node) {
    super(node.getKnot());
    
    this.frontPart = new LinkPart({
      source: getNodeByKnot(this.getKnot().subject),
      target: getNodeByKnot(this.getKnot())
    });
    this.backPart = new LinkPart({
      source: getNodeByKnot(this.getKnot()),
      target: getNodeByKnot(this.getKnot().object)
    });
  }
  subject() {}
  predicate() {}
  object() {}
  triple() {}
  
  linkParts() {
    return [this.frontPart, this.backPart];
  }
}

class LinkPart {
  constructor({ source, target }) {
    this.source = source;
    this.target = target;
  }
}

export default class TripleNotes extends Morph {

  async initialize() {
    this.windowTitle = "Knot Explorer";
    
    let parentElement = this.get('#graph');
    var width,height;
    var chartWidth, chartHeight;
    var margin;
    var svg = d3.select(parentElement)
      .append("svg");
    var graphContainer = svg.append("g").classed("graphContainer", true);

    setSize();

    let graph = await Graph.getInstance();
    
    let knots = graph.knots;
    this.updateStatistics(knots);
    
    let nodes = knots.map(getNodeByKnot);
    let links = nodes
      .filter(node => node.isTriple())
      .map(node => new Link(node));
    
    let hiddenLinks = [];
		links.forEach(link => hiddenLinks = hiddenLinks.concat(link.linkParts()));

    drawChart({
      nodes,
      links,
      hiddenLinks
    });

    lively.addEventListener("triple-notes", this, "extent-changed", e => { setSize(); });

    function setSize() {
      width = parentElement.clientWidth;
      height = parentElement.clientHeight;
      //console.log(`%cwidth: ${width} height: ${height}`, 'font-size: 20pt')

      margin = {top:0, left:0, bottom:0, right:0 };

      chartWidth = width - (margin.left+margin.right)
      chartHeight = height - (margin.top+margin.bottom)

      //graphContainer.attr("width", width).attr("height", height)

      svg
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("transform", "translate("+[margin.left, margin.top]+")");
    }

    function zoomed() {
      graphContainer.attr("transform", d3.event.transform);
    }
    
    svg.call(d3.zoom()
			.duration(150)
    	.scaleExtent([MIN_MAGNIFICATION, MAX_MAGNIFICATION])
      .on("zoom", zoomed));
    
    function drawChart({ nodes, links, hiddenLinks }) {
        
      var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.index).distance(200))
        //.force("collide",d3.forceCollide(d => d.r + 8).iterations(16) )
        .force("charge", d3.forceManyBody().strength(node => node.isTriple() ? -190*0.5 : -190))
        .force("center", d3.forceCenter(chartWidth / 2, chartWidth / 2))
        .force("y", d3.forceY(0).strength(0.001))
        .force("x", d3.forceX(0).strength(0.001));

      let linkContainer = graphContainer.append("g").classed("linkContainer", true);
      var hiddenLinkElements = linkContainer.selectAll("line")
        .data(hiddenLinks).enter()
        .append("line")
        .style("stroke", "blue")
        .style("stroke-width", "23");
      
      let nodeContainer = graphContainer.append("g").classed("nodeContainer", true);
      let nodeElements = nodeContainer.selectAll(".node")
        .data(nodes).enter()
        .append("g")
        .attr("class", "node")
        .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended))
          .on("dblclick", async node => { 
            d3.event.stopPropagation();

            let knotView = await lively.openComponentInWindow("knot-view");
            knotView.loadKnotForURL(node.getKnot().url);
          });

      nodeElements.each(function (node) {
  			node.draw(d3.select(this));
      });

      nodeElements.append("text")
        .attr("class", "text")
        .style("text-anchor", "middle")
        .text(d => d.label());

      function recalculatePositions() {
        nodeElements.attr("transform", d => "translate(" + d.x + "," + d.y + ")");

        hiddenLinkElements
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x + 30)
          .attr("y2", d => d.target.y + 30);
      }  
      
      simulation
        .nodes(nodes)
        .on("tick", recalculatePositions);
  
      simulation.force("link")
        .links(hiddenLinks);
      
      function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      
      function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
      }
      
      function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
    }
  }
  
  updateStatistics(knots) {
    this.get('#number-of-knots').innerHTML = knots.length;
    this.get('#number-of-triples').innerHTML = knots.filter(k => k.isTriple()).length;
  }
}