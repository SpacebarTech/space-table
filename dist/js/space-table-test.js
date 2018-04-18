var spaceTableTestVM = new Vue( { // eslint-disable-line
	el   : '#container',
	data : {
		table : {
			columns : {
				name : {
					default : 'No Name',
					name    : 'Name',
					visible : true
				},
				age : {
					default : 'No Age',
					name    : 'Age',
					order   : 1,
					visible : true
				},
				progress : {
					name    : 'Progress',
					type    : 'custom',
					visible : true
				},
				close : {
					type        : 'control',
					icon        : 'close',
					columnClass : 'close-button',
					width       : 'min',
					visible     : true
				}
			},
			rows : [{
				name : 'Tim',
				age  : 20,
				key  : 'tim'
			}, {
				name : 'Spencer',
				age  : 25,
				key  : 'spencer'
			}],
			options : {
				selectable : true,
				uniqueKey  : 'key'
			}
		}
	},

	methods : {

		sortAgeColumn( a, b ) {

			return a - b;
		},

		logEvent( args ) {
			console.log( ...args );
		},

		renderProgressBar( row ) {

			var age      = parseInt( row.age, 10 );
			var width    = Math.min( 1, age / 80 );
			var barClass = width === 1 ? 'full' : '';

			return `<div class='progress-bar ${barClass}'>\
				<div class='progress-indicator' style='width: ${width * 100}%;'>\
				</div>\
			</div>`;

		},

		removeRow( row ) {

			var key    = row.key;
			var rIndex = this.table.rows.findIndex( a => a.key === key );

			this.table.rows.splice( rIndex, 1 );

		}

	}
} );
