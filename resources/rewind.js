// Adapted from https://github.com/placemark/geojson-rewind/
/*
MIT License

Copyright (c) 2022 Placemark

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

(function(root){

	var OI = root.OI || {};
	function rewindGeometry(geometry, outer){
		if(typeof outer!=="boolean") outer = false;
		console.log(geometry.type);
		switch (geometry.type) {
			case 'Polygon': {
				if (!geometry.coordinates) return geometry;
				return {
					...geometry,
					coordinates: rewindRings(geometry.coordinates, outer)
				};
			}
			case 'MultiPolygon': {
				if (!geometry.coordinates) return geometry;
				return {
					...geometry,
					coordinates: geometry.coordinates.map((polygon) =>
						rewindRings(polygon, outer)
					)
				};
			}
			case 'GeometryCollection': {
				return {
					...geometry,
					geometries: geometry.geometries.map((geometry) => {
						return rewindGeometry(geometry, outer);
					})
				};
			}
			default: {
				return geometry;
			}
		}
	}


	function rewindRings(rings, outer){
		if(typeof outer!=="boolean") console.error('outer should be a boolean',outer,rings)
		if (rings.length === 0) return rings;

		const rewound = new Array();

		for (let i = 0; i < rings.length; i++) {
			rewound.push(rewindRing(rings[i], i === 0 ? outer : !outer));
		}

		return rewound;
	}


	/**
	 * Compute the area of a ring to decide whether to wind it
	 * clockwise or not.
	 */
	function rewindRing(ring, dir) {
		if(typeof dir!=="boolean") console.error('dir should be a boolean',dir,ring);
		let area = 0;
		let err = 0;
		for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
			const k = (ring[i][0] - ring[j][0]) * (ring[j][1] + ring[i][1]);
			const m = area + k;
			err += Math.abs(area) >= Math.abs(k) ? area - m + k : k - m + area;
			area = m;
		}
		if (area + err >= 0 !== !!dir) return ring.slice().reverse();
		return ring;
	}

	// Winding order. By default, this uses the RFC7946 order which is what is in the GeoJSON standard.
	let Winding = 'RFC7946';

	/**
	 * # Wind the rings of polygons and multipolygons.
	 *
	 * This creates a copy of the input.
	 *
	 * - outer as false is the default, which is the GeoJSON RFC way.
	 * - outer as true is for d3-geo.
	 */
	function rewindFeature(feature, winding){
		/* Winding order. By default, this uses the RFC7946 order,
		 * which is what is in the GeoJSON standard.
		 *
		 * You can also choose to wind in the d3 order.*/
		if(winding != "RFC7946" && winding != "d3") winding = Winding;
		const geometry = feature.geometry;
		if(!geometry) return feature;
		const geometryRewound = rewindGeometry(geometry, winding === 'd3');
		if(geometryRewound === geometry) return feature;

		return {
			...feature,
			geometry: geometryRewound
		};
	}

	function rewindFeatureCollection(featureCollection,outer){
		if(typeof outer!="string") Winding = 'RFC7946'

		return {
			...featureCollection,
			features: featureCollection.features.map((feature) =>
				rewindFeature(feature, outer)
			)
		};
	}

	if(!OI.geojsonRewind) OI.geojsonRewind = rewindFeatureCollection;
	root.OI = OI;
})(window || this);