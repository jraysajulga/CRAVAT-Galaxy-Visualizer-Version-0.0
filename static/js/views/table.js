define([],
	function(){
		return Backbone.View.extend({

			className : 'dataTable',

			events: {
				//'click tbody tr' : 'loadViewer',
			},

			initialize: function(options){
				this.name = options.name;
				this.model.on('change:shownHeaders',this.refreshHeaders, this);
				this.firstRun = true;
				this.frameViewer = options.frameViewer;
				this.render();
				this.dataTable = $('#' + this.name).DataTable();
			},

			render : function(){
				this.$el.append('<div id="' + this.name + 'DataTable" style="display: none;"><table id="' + this.name + '"></table></div>');
				var view = this;
			},

			loadingIndicator : function(){
				console.log('Loading indicator');
				this.$el.html('<div class="indicator"><h2>Retrieving Data...</h2><div class="loaderIndicator"></div></div>');
			},

			loadTable : function(){
				// Initializes the table
				this.render();
				this.dataTable = $('#' + this.name);
				console.log('Loading data for ' + this.name);

				var view = this;
				var data = this.model.get('data');
				if ( ! $.fn.DataTable.isDataTable(this.dataTable)){	
					this.dataTable.DataTable({
								data : data,
								columns : this.formatToDataTableHeader(this.model.allHeaders),
								select : true,
								'scrollX': true,
								'initComplete': function(settings, json) {
									console.log('SHOWING');
									$('#' + view.name + 'DataTable').show();
									if (view.$el.find('.indicator')){
										console.log('REMOVING');
										//view.$el.find('.indicator').remove();
									}
					}
					});
				} else {
					this.dataTable.DataTable().clear();
					for (var i = 0; i < data.length; i++){
						this.dataTable.DataTable().row.add(data[i]);
					}
					this.dataTable.DataTable().draw();
				}


				if (this.frameViewer){
					this.dataTable.DataTable().on('select', function (e, dt, type, indexes) {
						if (type === 'row' ){
							var data = view.model.get('data')[indexes[0]];
							view.loadViewer(data);
						}
					});
				}

				if (this.model.get('shownHeaders')){
					this.refreshHeaders();
				}
				this.dataTable.DataTable().row(':eq(0)').select();
				this.firstRun = true;
			},

			refreshHeaders : function(){
				var targetVisibility = this.dataTable.DataTable().columns().visible();
				var currentVisibility = this.model.columnVisibility();
				var col;
				for (var i = 0; i < targetVisibility.length; i++){
					if (targetVisibility[i] !== currentVisibility[i]){
						col = this.dataTable.DataTable().columns(i);
						col.visible(!col.visible()[0]);
					}
				}
			},

			draw : function(){
				if (this.dataTable.DataTable()){
					this.dataTable.DataTable().draw();
				}
			},

			formatToDataTableHeader : function(header){
				var header_columns = [];
				for (var i = 0; i < header.length; i++){
					header_columns.push({title:header[i]});
				}
				return header_columns;
			},

			loadTableData: function(ID){
				var view = this;
				var xhr = jQuery.getJSON("/api/datasets/" + ID, {
					data_type : 'raw_data',
					provider : 'column'
				})
				console.log('Loading table data for ' + ID)
				xhr.done( function( response ){
					view.headers = response.data.shift();
					view.data = response.data;
					view.fillOutEndData();
					view.renderTable(view.data, view.formatToDataTableHeader(view.headers));
				});
			},

			fillOutEndData: function(){
				for (var i = 0; i < this.data.length; i++){
					missing_len = this.headers.length - this.data[i].length;
					if (missing_len > 0){
						for (var j = 0; j < missing_len; j++){
							this.data[i].push("");
						}
					}
				}
			},

			renderFrame: function(){
				this.$el.append('<div class="frame"></div>');
				console.log(this.$el);
			},


			loadViewer : function(row){
				console.log('loading viewer');
				$('#variantviewer').attr('src',this.getLink(row));
			},

			getLink : function(row_data){
				var headers = this.model.allHeaders;
				var chrom = row_data[headers.indexOf('Chromosome')];
				var pos = row_data[headers.indexOf('Position')];
				var ref = row_data[headers.indexOf('Reference base(s)')];
				var alt = row_data[headers.indexOf('Alternate base(s)')];

				tpl = _.template('http://staging.cravat.us/CRAVAT/variant.html?variant=<%= chr %>_<%= position %>_-_<%= ref_base %>_<%= alt_base %>');

				link = tpl({chr: chrom,
					position: pos,
					ref_base: ref,
					alt_base: alt});
				return link;
			},

			hideColumn : function(header){
				var table = $(this.idName + 'DataTable').DataTable();
				index = this.headers.indexOf(header);
				table.column(index).visible(false);
			},

			showColumn : function(header){
				var table = $(this.idName + 'DataTable').DataTable();
				index = this.headers.indexOf(header);
				table.column(index).visible(true);
			},

			displayColumns : function(new_headers){
				var all_headers = this.headers;
				// If this header is not within the new header config, then hide it.
				var header;
				for (var i = 0; i < all_headers.length; i++){
					header = all_headers[i];
					new_headers.indexOf(header) < 0 ? this.hideColumn(header) : this.showColumn(header);
				}
			}
		});
	})