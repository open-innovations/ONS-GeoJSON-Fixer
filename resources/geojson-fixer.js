/* Open Innovations ONS GeoJSON Fixer v0.1 */
(function(root){

	// Part of the Open Innovations namespace
	var OI = root.OI || {};
	if(!OI.ready){
		OI.ready = function(fn){
			// Version 1.1
			if(document.readyState != 'loading') fn();
			else document.addEventListener('DOMContentLoaded', fn);
		};
	}

	function Fixer(){
		
		var _obj = this;
		this.osgb=new GT_OSGB();
		this.el = {
			'dropzone':document.getElementById('drop_zone'),
			'files':document.getElementById('standard_files'),
			'details':document.getElementById('filedetails'),
			'output':document.getElementById('output'),
			'loader':document.getElementById('loader'),
			'progressbar':document.getElementById('progressbar'),
			'progress':document.querySelector('#progressbar .progress-inner'),
			'reset':document.querySelector('#validation_form input[type=reset]')
		}

		// Set up the drop zone
		this.el.dropzone.addEventListener('dragover', dropOver, false);
		this.el.dropzone.addEventListener('dragout', dragOff, false);

		this.el.files.addEventListener('change',function(evt){
			evt.stopPropagation();
			evt.preventDefault();
			_obj.reset();
			return _obj.handleFileSelect(evt,'geojson');
		}, false);
		
		this.el.reset.addEventListener('click',function(){ _obj.reset(); });


		this.log = function(txt,e){
			console.info(txt,e);
			if(this.el.loader) this.el.loader.innerHTML = '<div class="padded"><strong>INFO:</strong> '+txt+'</div>';
		}
		this.warning = function(txt,e){
			console.warn(txt,e);
			if(this.el.loader) this.el.loader.innerHTML = '<div class="padded warning"><strong>WARNING:</strong> '+txt+'</div>';
		}
		this.error = function(txt,e){
			console.error(txt,e);
			if(this.el.loader) this.el.loader.innerHTML = '<div class="padded error"><strong>ERROR:</strong> '+txt+'</div>';
		}
		this.reset();
		return this;
	}
	Fixer.prototype.reset = function(){
		this.el.dropzone.classList.remove('loaded');
		this.el.output.innerHTML = "";
		this.el.progress.parentNode.classList.remove('done');
		this.el.progressbar.style.display = "none";
		
		delete this.geojson;
		delete this.filecontent;
		delete this.filesize;
		delete this.file;
		delete this.output;
		return this;
	};
	Fixer.prototype.handleFileSelect = function(evt,typ){

		dragOff(evt);

		var files,f,output,start,stop,_obj;
		if(evt.dataTransfer && evt.dataTransfer.files) files = evt.dataTransfer.files; // FileList object.
		if(!files && evt.target && evt.target.files) files = evt.target.files;

		if(typ == "geojson"){

			// files is a FileList of File objects. List some properties.
			output = "";
			f = files[0];

			this.file = f.name;
			this.filesize = f.size;
			// ('+ (f.type || 'n/a')+ ')
			output += '<strong>'+ (f.name)+ '</strong> - ' + niceSize(f.size) + ', last modified: ' + (f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a');

			start = 0;
			stop = f.size - 1; //Math.min(100000, f.size - 1);

			var reader = new FileReader();

			_obj = this;
			this.output = '';
			// Closure to capture the file information.
			reader.onloadend = function(evt) {
				var result;
				if (evt.target.readyState == FileReader.DONE) { // DONE == 2
					if(stop > f.size - 1){
						var l = evt.target.result.regexLastIndexOf(/[\n\r]/);
						result = (l > 0) ? evt.target.result.slice(0,l) : evt.target.result;
					}else result = evt.target.result;

					_obj.loadedGeoJSON(result);
				}
			};
			
			// Read in the image file as a data URL.
			var blob = f.slice(start,stop+1);
			reader.readAsText(blob);

			this.el.details.innerHTML = output;
			this.el.dropzone.classList.add('loaded');
			
		}
		return this;
	};
	
	Fixer.prototype.fixGeoJSON = function(f){
		if(typeof f!=="number"){
			f = 0;
			this.el.progress.style.width = '0%';
			this.el.progressbar.style.display = 'block';
		}
		var fp,g,i,j,k,n = 0,loop = 10000;
		for(fp = f; fp < this.geojson.features.length; fp++){
			g = this.geojson.features[f].geometry;
			if(g.type=="MultiPolygon"){
				for(i = 0; i < g.coordinates.length; i++){
					for(j = 0; j < g.coordinates[i].length; j++){
						for(k = 0; k < g.coordinates[i][j].length; k++){
							g.coordinates[i][j][k] = this.convertCoordiates(g.coordinates[i][j][k]);
							n++;
						}
					}
				}
			}else if(g.type=="Polygon"){
				for(i = 0; i < g.coordinates.length; i++){
					for(j = 0; j < g.coordinates[i].length; j++){
						g.coordinates[i][j] = this.convertCoordiates(g.coordinates[i][j]);
						n++;
					}
				}
			}else if(g.type=="Point"){
				console.log(f,"Point");
			}
			this.geojson.features[f].geometry = g;			
			f++;
			if(n > loop) fp = this.geojson.features.length;
		}
		var _obj = this;
		this.el.progress.style.width = (100*f/this.geojson.features.length)+'%';
		
		if(f < this.geojson.features.length) setTimeout(function(){ _obj.fixGeoJSON(f) },50);
		else this.finish();
		return;
	}

	Fixer.prototype.loadedGeoJSON = function(result){

		var geojson,save;
		var _obj = this;

		// Attempt to parse the input
		try{
			this.geojson = JSON.parse(result);
		}catch(err){
			this.geojson = {};
			this.error('The JSON in your file does not appear to parse as valid. You may want to check it with <a href="https://jsonlint.com/">JSON Lint</a>',err);
			return this;
		};
		
		if("crs" in this.geojson){
			if(this.geojson.crs.properties.name != "EPSG:27700"){
				this.error("The provided CRS isn't EPSG:27700 so we don't know how to handle it.");
				return this;
			}
		}else{
			this.error("The input GeoJSON doesn't contain a CRS.");
			return this;
		}

		delete this.geojson.crs;

		this.fixGeoJSON();
	};
	Fixer.prototype.convertCoordiates = function(coo){
		this.osgb.setGridCoordinates(coo[0],coo[1]);
		wgs84 = this.osgb.getWGS84();
		return [+(wgs84.longitude.toFixed(5)),+(wgs84.latitude.toFixed(5))];
	};
	Fixer.prototype.finish = function(){

		this.output = JSON.stringify(this.geojson).replace(/\{\s*\"type\":\s*"Feature",/g,"\n{\"type\":\"Feature\",");
		this.el.progressbar.style.display = 'none';

		var mapel = document.createElement('div');
		mapel.setAttribute('id','map');
		this.el.output.appendChild(mapel);
		var map = L.map(mapel,{'scrollWheelZoom':true});
		// CartoDB map
		L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
			attribution: 'Tiles: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
			subdomains: 'abcd',
			maxZoom: 19
		}).addTo(map);
		var geo = L.geoJSON(this.geojson,{
			'style':{
				"color": "#FF6700",
				"weight": 1,
				"opacity": 0.5
			}
		}).addTo(map);
		map.fitBounds(geo.getBounds());

		details = document.createElement('div');
		details.innerHTML = "Converted file is "+niceSize(this.output.length)+".";
		this.el.output.appendChild(details);

		save = document.createElement('button');
		save.classList.add('c14-bg');
		save.innerHTML = "Save fixed GeoJSON";
		this.el.output.appendChild(save);
		var _obj = this;
		save.addEventListener('click',function(){ _obj.save(); });


		return this;
	};
	Fixer.prototype.save = function(){

		if(!this.output) return this;

		// Bail out if there is no Blob function
		if(typeof Blob!=="function") return this;

		var textFileAsBlob = new Blob([this.output], {type:'text/plain'});
		if(!this.file) this.file = "output.geojson";
		var fileNameToSaveAs = this.file.substring(0,this.file.lastIndexOf("."))+".geojson";

		function destroyClickedElement(event){ document.body.removeChild(event.target); }

		var dl = document.createElement("a");
		dl.download = fileNameToSaveAs;
		dl.innerHTML = "Download File";
		if(window.webkitURL != null){
			// Chrome allows the link to be clicked
			// without actually adding it to the DOM.
			dl.href = window.webkitURL.createObjectURL(textFileAsBlob);
		}else{
			// Firefox requires the link to be added to the DOM
			// before it can be clicked.
			dl.href = window.URL.createObjectURL(textFileAsBlob);
			dl.onclick = destroyClickedElement;
			dl.style.display = "none";
			document.body.appendChild(dl);
		}
		dl.click();

		return this;
	};
	function dropOver(evt){
		evt.stopPropagation();
		evt.preventDefault();
		evt.target.classList.add('drop');
		evt.target.classList.remove('loaded');
	}
	function dragOff(evt){
		evt.target.classList.remove('drop');
	}
	function niceSize(b){
		if(b > 1e12) return (b/1e12).toFixed(2)+" TB";
		if(b > 1e9) return (b/1e9).toFixed(2)+" GB";
		if(b > 1e6) return (b/1e6).toFixed(2)+" MB";
		if(b > 1e3) return (b/1e3).toFixed(2)+" kB";
		return (b)+" bytes";
	}

	OI.ready(function(){
		OI.ONSFixer = new Fixer();
	});

	root.OI = OI;
})(window || this);