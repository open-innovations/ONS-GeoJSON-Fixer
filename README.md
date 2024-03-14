# ONS GeoJSON Fixer

At Open Innovations we often work with boundaries from the ONS geoportal. Unfortunately, the geoportal often provides invalid GeoJSON files that don't conform to [RFC 7946 (2016)](https://geojson.org/) as they contain Ordnance Survey Eastings and Northings rather than WGS 84 latitudes and longitudes. The purpose of this tool is to convert them into something valid.