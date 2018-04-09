define (['plugin/test-data'],
	function(){
		return Backbone.Collection.extend({

			initialize : function () {
				console.log('Data collection has initialized!');
				this.jobID = null;
				this.datasetID = null;
				this.datasetIDs = [];
				this.reportNames = ['#Variant Additional Details Report', 
                            '#Gene Level Annotation Report',
                            '#Non-coding Variant Report',
                            '#Input Errors Report'];
                this.datasets = [];
			},

			// fetchHistoryID: Fetches history ID, then finds its dataset IDs...
			// fetchDatasetIDs: ...then finds this dataset's ID within the list and returns the relevant IDs around it...
			// fetchData: ...then uses those IDs to fetch their respective datasets.
			fetch : function(datasetID){
				this.datasetID = datasetID;
				this.fetchHistoryID();
			},

			fetchHistoryID : function(){
				var view = this;
				var xhr = jQuery.getJSON('/api/datasets/' + this.datasetID);

				xhr.done(function(response){
					view.fetchDatasetIDs(response);
				})
			},

			// Put in case where datasets of CRAVAT outputs are not contiguous within the history

			fetchDatasetIDs : function(response){
				this.reportName = response.metadata_column_names[0];
				var view = this;
				var historyID = response.history_id;
				//var i = response.metadata_column_names[0]; // Index of current dataset within the history

				this.jobID =  response.peek.slice(response.peek.indexOf('Job Id') + 8, -1).split('</td>')[0];

				var xhr = jQuery.getJSON('/api/histories/' + response.history_id);

				xhr.done(function(response){
					console.log('1.) Obtaining dataset IDs');

					// List of IDs within this history
					IDs = response.state_ids.ok;
					
					reportIndex = view.reportNames.indexOf(view.reportName);

					// Index of dataset within history
					datasetIndex = IDs.indexOf(view.datasetID);

					// Index of first report
					i = datasetIndex - reportIndex;

					for(var n = 0; n < view.reportNames.length; n++){
						view.datasetIDs[view.reportNames[n]] = IDs[i++];
						view.datasets.push({report_name : view.reportNames[n],
												dataset_id : IDs[i-1],
											id : n});
					}

					view.fetchDatasets();
					view.fetchSummaryData();

				});
			},

			/*mapPeptides : function(data){
				var peptideMap = {};
				var s = /[_|:|,]([A-Z][0-9]+[A-Z]),/g;
				var m;
				for (var i = 0; i < data.length; i++){
					row = data[i];
					protein = row[1];
					peptide_seq = row[2];

					do {
						m = s.exec(protein);
						if (m) {
							peptideMap[m[1]] = peptide_seq;
						}
					} while(m);
				}
				variantData = this.where({'name':'variant'})[0].data;
				for (var i = 0; i < variantData.length; i++){
					seq_change = variantData[i][12];
					console.log(seq_change);
					console.log(peptideMap[seq_change]);
				}
				return peptideMap
			},*/

			// Finish this!
			checkDatasetIDs : function(){
				for (var i = 0; i < this.reportNames.length; i++){
					datasetID = this.datasetIDs[this.reportNames[i]]
					console.log(this.datasetIDs);
					var xhr = jQuery.getJSON('/api/datasets/' + datasetID);
				}
			},

			checkName : function(IDs){
				for (var i = 0; i < IDs.length; i++){
					var xhr = jQuery.getJSON('/api/datasets/' + IDs[i]);
					xhr.done(function(response){
						console.log(response.name);
						var match = response.name.match('.*PSM.*');
						if (match){
							console.log(match);
						}
					});
				}

			},

			fetchSummaryData : function(){
				var ID = this.datasetIDs[this.reportNames[0]];
				var indices = '2,3,10,9';
				var xhr = jQuery.getJSON('/api/datasets/' + ID, {
					data_type : 'raw_data',
					provider : 'column',
					indeces : indices
				});
				var view = this;
				xhr.done(function(response){
					console.log('CIrcos data finished');
					view.at(0).set('Summary Data', response.data);
				});

			},

			fetchDatasets : function(){
				console.log('2.) Obtaining data for each dataset: ');
				// Issues each dataModel to fetch their datasets by feeding them their corresponding dataset IDs.
				this.lim = 100;
				this.comment_lines = 11;
				var view = this;
				for (var i = 0; i < this.reportNames.length; i++){
					//this.at(i).fetchData(this.datasetIDs[this.reportNames[i]]);
					var ID = this.datasetIDs[this.reportNames[i]];

					// Obtains the lengths of the datasets
					var xhr2 = jQuery.getJSON('/api/datasets/' + ID);
					this.at(i).id = ID;

					xhr2.done(function(response){
						var dataset = view.datasets.filter(function(a){
							return a.report_name == response.metadata_column_names[0]
						})
						n = dataset[0].id;
						index = response.misc_blurb.search(/ lines/);
						number = parseInt(response.misc_blurb.slice(0,index).replace(',',''));
						view.at(n).set('length', parseInt(number) - view.comment_lines);
					});

					// Obtains the actual data of the datasets
					var xhr = jQuery.getJSON('/api/datasets/' + ID, {
						data_type : 'raw_data',
						provider : 'column',
						limit: this.lim
					});

					if (false){
						//if (i == 2){
						if (false){	
							view.at(i).setSortingData(ID);
						} else{
							var data = testData[view.at(i).name];
							view.at(i).setData(data);
							//view.at(i).setData()
						}
					} else {
						xhr.done(function(response){
							resp = this;
							var dataset = view.datasets.filter(function(a){
								return a.dataset_id == resp.url.match('/datasets/([a-f|0-9]+)')[1]
							})
							i = dataset[0].id;
							view.targetDataset = view.at(i);

							//if (response.data.length >= view.lim - 1){
							if (response.data.length > 100000){
							//if (true){
							//if (i == 3){
								console.log('Setting sorting data');
								var xhr = jQuery.getJSON('/api/datasets/' + dataset[0].dataset_id, {
									data_type : 'raw_data',
									provider : 'column',
								});
								// Consider offsetting by the limit and appending to the end of the truncated dataset.
								xhr.done(function(response){
									console.log('Finished!');
									resp = this;
									var dataset = view.datasets.filter(function(a){
										return a.dataset_id == resp.url.match('/datasets/([a-f|0-9]+)')[1]
									});
									i = dataset[0].id;
									view.at(i).setSortingData(response.data);
								});
								//view.at(i).setSortingData(dataset[0].dataset_id);
								//view.at(i).fetchData(dataset[0].dataset_id);
							} else {
								view.targetDataset.setData(response.data);
							}
						});
					}
				}

			}
		})
	})