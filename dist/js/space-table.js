Vue.component( 'space-table', { // eslint-disable-line

	template : '#space-table',

	data() {

		const rows = this.data;

		return {

			// table properties
			rows,

			// search stuffz
			searchTimeout : null,
			searchQuery   : '',
			index         : {},
			searchRows    : [],

			// paginate pages
			pageLength : 10,
			activePage : 0,

			// column sorts
			sortedColumn  : null,
			sortDirection : -1,

			// column hiding
			shownColumns : [],

			// selectable rows
			selectedMap : {},

			// column filters
			inputFilters : {},
			filteredRows : [],

			//settings panel
			settingsPanelOpen : false,

		};

	},

	created() {

		this.updateIndex();

	},

	methods : {

		/* * * * * * * * * * *
		 * Internal Methods  *
		 * * * * * * * * * * */

		matchHeight( selector ) {

			const elements = document.querySelectorAll( selector );

			let height = 0;

			elements.forEach( ( el ) => {

				if ( el.offsetHeight > height ) {
					height = el.offsetHeight;
				}

			} );

			elements.forEach( ( el ) => {
				el.style.height = `${height}px`;
			} );
		},

		applyStyles( selector, styleObj ) {

			const styleKeys = Object.keys( styleObj );

			styleKeys.forEach( key => {

				const elements = document.querySelectorAll( selector );

				elements.forEach( ( el ) => {

					el.style[key] = styleObj[key];

				} )

			} );

		},

		HasProperty( a, b ) { Object.prototype.hasOwnProperty.call( a, b ) },

		/*
		 * converts object to array
		 * obj - object - object to be turned into array
		 *
		 * returns Object[]
		 */
		objToArray( object ) { // eslint-disable-line

			if ( object === null || object === undefined ) {
				return [];
			}

			const keys  = Object.keys( object );
			const array = keys.reduce( ( arr, key ) => {

				const obj = object[key];

				if ( !this.HasProperty( obj, 'key' ) ) {
					obj.key = key;
				}

				arr.push( obj );

				return arr;

			}, [] );

			return array;

		},

		// changed column to columnKey, because how it is called from the 'props.rows' watch function
		sortColumn( column, toggle = true ) {

			const columnKey = column.key;

			// if we just sorted this column,
			// or need to sort it again because
			// of an activerow change, etc.
			// sort it up
			if ( this.sortedColumn !== columnKey || !toggle ) {

				if ( toggle ) {
					this.sortDirection = -1;
				}

				let sortFunction = this.defaultSort;

				if ( this.sort.hasOwnProperty( columnKey ) ) { // eslint-disable-line
					sortFunction = this.sort[columnKey];
				}

				this.rows = this.rows.sort( ( a, b ) => sortFunction( a[columnKey], b[columnKey], a, b ) );

			}

			// if this column is already the
			// column being sorted, just reverse it
			else {

				this.sortDirection *= -1;
				this.rows          = this.rows.reverse();

			}

			// indicate this column as sorted
			this.sortedColumn = columnKey;

		},

		defaultSort( a, b ) {

			if ( typeof a === 'number' && typeof b === 'number' ) {
				return a - b;
			}

			if ( typeof a === 'number' ) {
				a = a.toString(); // eslint-disable-line
			}

			if ( typeof b === 'number' ) {
				b = b.toString(); // eslint-disable-line
			}

			const A = a ? a.toUpperCase() : a;
			const B = b ? b.toUpperCase() : b;

			if ( A === B ) {
				return 0;
			}

			return ( ( A < B ) ? 1 : -1 );

		},

		toggleRow( row ) { // eslint-disable-line

			const key = this.settings.uniqueKey;

			if ( !this.selectedMap.hasOwnProperty( row[key] ) ) { // eslint-disable-line
				return Vue.set( this.selectedMap, row[key], true );
			}

			// you must set this to false before deleting it
			// otherwise the view will not update
			this.selectedMap[row[key]] = false;

			delete this.selectedMap[row[key]];

		},

		selectedFunction( selectedRows ) {

			// To remove the highest index row first. If you remove highest index
			// rows first it doesnt affect the position of the lower index
			selectedRows.sort( ( a, b ) => { // eslint-disable-line

				return b.index - a.index;

			} );

			for ( const i in selectedRows ) { // eslint-disable-line

				const row = selectedRows[i];

				row.selected = false;
				row.disable  = true;

				this.allRows.splice( row.index, 1 );

			}

			// update index after removing elements from the main array (allRows);
			let index = 0;
			this.allRows = this.allRows.map( ( a ) => {

				a.index = index++; // eslint-disable-line

				return a;

			} );


			this.selectedButton.clickHandler( selectedRows );

			this.selectedRows = [];

		},

		updateIndex() {

			// index these motherfuckers
			const Index = new BM25(); // eslint-disable-line

			for ( const i in this.data ) { // eslint-disable-line

				Index.addDocument( this.data[i], i );

			}

			this.index = Index;

		},

		isEmptyObject( obj ) {
			return Object.keys(obj).length === 0 && obj.constructor === Object;
		},

		stripBR( str ) {

			return str.replace(/[<]br[^>]*[>]/gi,"");  // removes all <br>

		},

		// returns index of the beginning of the match or -1 if no match
		findMatch( a, b ) {

			const longest  = a.length > b.length ? a : b;
			const shortest = longest === a ? b : a;

			let shortestIndex = 0;
			let errorsSoFar   = 0;
			const errorsAllowed = 2;
			let lastError     = null;

			for ( let i = 0; i < longest.length; i++ ) { // eslint-disable-line

				const lettersMatch = ( longest[i] === shortest[shortestIndex] );

				// if these letters match, check the next set of letters
				if ( lettersMatch ) {

					shortestIndex++; // eslint-disable-line

					// unless of course, that was the last letter, in which
					// case, we found a match!
					if ( shortestIndex === shortest.length ) {
						return i - ( shortest.length - 1 );
					}

				}

				// if they don't match
				else {

					// it's okay if we're still looking for
					// the start of the string
					if ( shortestIndex === 0 ) {

						// unless of course, the remainder of the long string is
						// shorter than the short string
						if ( longest.length - i < shortest.length ) {
							return -1; // in that case, we know this isn't a match
						}

						continue; // eslint-disable-line

					}

					// if we're mid-string, record the error
					errorsSoFar++; // eslint-disable-line

					// check if this and the last letter were flipped around
					// like this: something -> somtehing
					const twoLettersFlippedAround = ( shortest[shortestIndex] === longest[i - 1] && shortest[shortestIndex - 1] === longest[i] ); // eslint-disable-line

					// if that's too many errors or it's a consecutive error that
					// wasn't caused by two letters being switched around
					if ( errorsSoFar > errorsAllowed || ( lastError === ( i - 1 ) && !twoLettersFlippedAround ) ) { // eslint-disable-line

						// restart looking for the beginning of the short string
						// within the long string from this point
						shortestIndex = 0;
						errorsSoFar   = 0;

						// unless of course, the remainder of the long string is
						// shorter than the short string
						if ( longest.length - i < shortest.length ) {
							return -1; // in that case, we know this isn't a match
						}

						continue; // eslint-disable-line

					}

					// if that wasn't too many errors, just move on
					// to the next letter, but record when our last
					// error was
					shortestIndex++; // eslint-disable-line
					lastError = i;

					// unless that was the last letter in which case,
					// that's a motherfucking match, cudi dude
					if ( shortestIndex === shortest.length ) {
						return i - ( shortest.length - 1 );
					}

				}

			}

			// if we made it here somehow, it's not a match
			return -1;

		},

		search( query ) {

			if ( query === '' ) {

				this.rows = this.data;

				if ( this.sortedColumn != null ) {
					this.sortColumn( this.sortedColumn, false );
				}

				return;

			}

			const searchTerms       = query.split( /\ +/ ); // eslint-disable-line
			const stripStopWords    = ( searchTerms.length > 2 );
			// true means don't strip stop words
			const tokenizedTerms    = this.index.tokenize( query, stripStopWords );
			const tokens            = [];
			const documentTokens    = Object.keys( this.index.terms );

			for ( const i in tokenizedTerms ) { // eslint-disable-line

				if ( this.index.terms.hasOwnProperty( tokenizedTerms[i] ) ) { // eslint-disable-line

					tokens.push( {
						term      : tokenizedTerms[i],
						relevance : 3
					} );

				}

				for ( const n in documentTokens ) { // eslint-disable-line

					const longest  = documentTokens[n].length > tokenizedTerms[i].length ? documentTokens[n] : tokenizedTerms[i]; // eslint-disable-line
					const shortest = longest === documentTokens[n] ? tokenizedTerms[i] : tokenizedTerms[i];

					const match = this.findMatch( documentTokens[n], tokenizedTerms[i] );

					if ( match !== -1 ) {

						tokens.push( {
							term      : documentTokens[n],
							relevance : shortest.length / ( shortest.length + match )
						} );

					}

				}

			}

			const index   = this.index.document; // eslint-disable-line
			const addedIn = {};
			const results = [];

			// for every token,
			for ( const n in tokens ) { // eslint-disable-line

				const term = this.index.terms[tokens[n].term];

				// check which rows it's in
				for ( const i in term.foundIn ) { // eslint-disable-line

					const rowId = term.foundIn[i];

					// if we've encountered this row from another
					// term, increment this rows relevance score
					if ( addedIn.hasOwnProperty( rowId ) ) { // eslint-disable-line

						if ( tokens[n].relevance < 1 ) {
							tokens[n].relevance *= tokens[n].relevance;
						}

						const rowIndexInResults = addedIn[rowId];

						// calculated by the length of the tokenized search query to this tokenized term
						const addedRelevance    = tokens[n].relevance;

						results[rowIndexInResults].relevance += addedRelevance;

						continue; // eslint-disable-line

					}

					// otherwise, make a note of where it is in
					// the results array
					addedIn[rowId] = results.length;

					// and put it in the results with our added properties
					const result = Object.assign( { relevance : tokens[n].relevance }, Object.assign( {}, this.data[rowId] ) ); // eslint-disable-line

					results.push( result );

				}

			}

			this.activePage = 0;
			this.searchRows = results.sort( ( a, b ) => b.relevance - a.relevance );

		},

		getTitle( column, row ) {

			switch ( column.type ) {

				case 'custom':

					if ( this.HasProperty( this.title, column.key ) ) {
						const title = this.title[column.key];

						if ( typeof title === 'function' ) {
							return title( row );
						}

						return title;
					}

					return this.renderCell( row, column.key );

					break; // eslint-disable-line

				default:

					return row[column.key];

					break; // eslint-disable-line

			}

		},

		exportCSV( csvName ) {
			// Building the CSV from the Data two-dimensional array
			// Each column is separated by ";" and new line "\n" for next row
			const data = this.filteredRows;
			const csvContent = this.jsonToCSV( data );

			const downloadName = csvName ? `${csvName}.csv` : 'download.csv';


			// The download function takes a CSV string, the filename and mimeType as parameters
			// Scroll/look down at the bottom of this snippet to see how download is called
			const download = ( content, fileName, mimeType ) => {

				const a = document.createElement('a');
				mimeType = mimeType || 'application/octet-stream';

				if ( navigator.msSaveBlob ) { // IE10

					navigator.msSaveBlob( new Blob([content], {
						type: mimeType
					} ), fileName );

				} else if ( URL && 'download' in a ) { //html5 A[download]

					a.href = URL.createObjectURL( new Blob([content], {
						type: mimeType
					} ) );

					a.setAttribute( 'download', fileName );

					document.body.appendChild( a );

					a.click();

					document.body.removeChild( a );

				} else {

					location.href = 'data:application/octet-stream,' + encodeURIComponent( content ); // only this mime type is supported

				}
			};

			download( csvContent, downloadName, 'text/csv;encoding:utf-8' );

		},

		jsonToCSV( objArray ) {

			const array = typeof objArray !== 'object' ? JSON.parse( objArray ) : objArray;

			let str = '';
			let line = '';

			const head = array[0];

			for (const index in array[0]) {

				const value = index + "";

				line += '"' + value.replace(/"/g, '""') + '",';

			}

			line = line.slice(0, -1);
			str += line + '\r\n';


			for (let i = 0; i < array.length; i++) {

				let line = '';



				for (const index in array[i]) {

					const value = array[i][index] + "";
					line += '"' + value.replace(/"/g, '""') + '",';

				}

				line = line.slice(0, -1);
				str += line + '\r\n';
			}

			return str;

		},

		/* * * * * * * * * * *
		 * Exported Methods  *
		 * * * * * * * * * * */

		emitCellClick( rIndex, cKey ) {

			const rowClicked    = this.activeRows[rIndex];
			const columnClicked = this.columns[cKey];
			const cellClicked   = {
				key   : cKey,
				value : rowClicked[cKey]
			};

			// check if there's a control for this cell
			const hasControl = ( () => {
				if ( !this.controls ) {
					return false;
				}

				if ( !HasProperty( this.controls, cKey ) ) {
					return false;
				}

				return true;
			} )();

			// you can use a contrl for any cell, but if
			// your cell is of type 'control' then you have
			// to have some kind of function bound to it.
			if ( columnClicked.type === 'control' && !hasControl ) {
				throw new Error( `No control method declared for control: ${cKey}.` );
			}

			// if we have a control, we won't release a row
			// clicked event for that click because we
			// assume your control is handling everything
			if ( hasControl ) {
				this.controls[cKey]( rowClicked, columnClicked );
			}
			else {
				this.$emit( 'row-clicked', rowClicked, cellClicked );
			}

			// still emit a cell-clicked idk if anybody even uses
			// this still
			this.$emit( 'cell-clicked', cellClicked, rowClicked );

		},

		renderCell( row, cKey ) {

			if ( !this.render ) {
				throw new Error( 'Unable to render custom cell in space-table. No render binding present on table.' );
			}

			if ( !this.render.hasOwnProperty( cKey ) ) { // eslint-disable-line
				throw new Error( `Unable to render cell in column: ${cKey}. No render function present in render binding.` );
			}

			return this.render[cKey]( row, row[cKey] );

		},

		styleCell( row, cKey ) {

			if ( !this.styleIcon ) {
				return {};
			}

			if ( !this.styleIcon.hasOwnProperty( cKey ) ) { // eslint-disable-line
				return {};
			}

			return this.styleIcon[cKey]( row, row[cKey] );


		},

		styleHover( row, cKey ) {

			const style = this.styleCell( row, cKey );

			if ( !style ) {
				return {};
			}

			const desiredProps = ['color', 'background', 'backgroundColor', 'background-color'];
			const newStyle     = desiredProps.reduce( ( hoverStyle, prop ) => {

				if ( HasProperty( style, prop ) ) {
					hoverStyle.backgroundColor = style[prop]; // eslint-disable-line
				}

				return hoverStyle;

			}, {} );

			const hexToRgba = ( hex, alpha = 1 ) => {
				const pieces = hex.match( /\w{2}/g );
				const rgb    = pieces.map( a => parseInt( a, 16 ) );

				return `rgba(${rgb.join( ', ' )}, ${alpha})`;
			};

			const isLightColor = ( color ) => {

				const hexColor = ( ( string ) => {
					if ( string.charAt( 0 ) === '#' ) {
						return hexToRgba( string );
					}

					return string;
				} )( color );

				const rgba   = /(\d(?:\.)?)+/g;
				const pieces = hexColor.match( rgba ).slice( 0, 3 );
				const total  = pieces.reduce( ( a, b ) => a + parseInt( b, 10 ), 0 );
				const avg    = total / pieces.length;

				return ( avg > 186 );

			};

			if ( HasProperty( newStyle, 'backgroundColor' ) ) {

				newStyle.color = isLightColor( newStyle.backgroundColor ) ? '#4a4a4a' : 'white';

			}

			return newStyle;

		},

		emitSelection( ) {

			this.$emit( 'items-selected', this.selectedRows );

			this.selectedMap = {};

		},

		getHoverText( row, cKey, hoverText ) {

			if ( !this.hoverText ) {
				return hoverText;
			}

			if ( !this.hoverText.hasOwnProperty( cKey ) ) {
				return hoverText;
			}

			return this.hoverText[cKey]( row, row[cKey] );

		},

		hasHoverText( column ) {
			return column.hasOwnProperty( 'hoverText' ) || this.hoverText.hasOwnProperty( column.key );
		},

		updateInputFilters( cols ) {

			// const colKeys = Object.keys( cols );
			const newInputFilters = {};

			cols.forEach( col => {

				const key = col.key;
				const keyExists = this.inputFilters.hasOwnProperty( key );


				if( keyExists ){
					newInputFilters[key] = this.inputFilters[key];
				} else {

					newInputFilters[key] = '';

				}

			});

			this.inputFilters = newInputFilters;

		},

		updateFilteredRows () {

			const inputFilters = this.inputFilters;
			const inputKeys = Object.keys( inputFilters );


			return inputKeys.reduce( ( rows, key ) => {

				const filter = inputFilters[key].toLowerCase();

				return rows.filter( row => {

					if( row[key] ) {
						return row[key].toString().toLowerCase().indexOf( filter ) !== -1;
					}

					return true;

				});

			}, this.searchRows );

		},

		/* * * * * * * * * * * * * *
		 * Settings Panel Methods  *
		 * * * * * * * * * * * * * */

		settingsIconClick() {

			// cool spin effect on icon
			const icon = document.getElementById("settingsIcon");

			icon.className += " spin";
			setTimeout(() => { icon.classList.remove("spin"); }, 1200);

			this.settingsPanelOpen = !this.settingsPanelOpen;

		},

		columnSelectorClick( column ) {

		// 	const cols = this.cols;
		//
		// 	const col = cols.find( c => column.key === c.key );
		//
		// 	col.visible = !col.visible;

			this.$forceUpdate()

		},

		columnPackageSelect( columns ) {

			const cols = this.cols;

			if( columns === 'All' ){

				cols.forEach( col => col.visible = true );

			}
			else {

				cols.forEach( col => {

					const column = columns.find( c => col.key === c.key );

					col.visible = !!column;

				} );

			}

			this.$forceUpdate();

		},

	},

	watch : {

		resetOn( reset ) { // eslint-disable-line

			if ( !reset ) {
				return console.log( 'no reset' );
			}

			console.log( 'reseting' );

			this.index = null;

			const needRevert = [
				'activePage',
				'selectedMap',
				'searchQuery',
				'sortDirection',
				'sortedColumn',
				'searchTimeout',
				'index',
				'sortDirection'
			];

			for ( const property of needRevert ) { // eslint-disable-line

				Destroy( this[property] );

				this.$revert( property );

			}

		},

		searchQuery( searchQuery ) {

			if ( this.searchTimeout != null ) {
				window.clearTimeout( this.searchTimeout );
			}

			this.searchTimeout = window.setTimeout( () => {
				this.search( searchQuery );
			}, 200 );

		},

		data : {

			deep : true,

			handler( rows ) {

				this.searchRows = rows;

				this.updateIndex();

				if ( this.searchQuery ) {
					this.search( this.searchQuery );
				}

				// reset the page number to the last page if new dataset
				// is smaller than previous dataset
				if( this.activePage > this.noOfPages ){
					this.activePage = this.noOfPages - 1;
				}

			}

		},

		indexedRows( rows ) {

			for ( const i in this.selectedMap ) { // eslint-disable-line

				if ( !rows.hasOwnProperty( i ) ) { // eslint-disable-line
					delete this.selectedMap[i];
				}

			}

		},

		inputFilters : {
			deep : true,
			handler() {
				this.filteredRows = this.updateFilteredRows( );
			}
		},

		searchRows() {
			this.filteredRows = this.updateFilteredRows();
		},


	},

	mounted() {
		this.searchRows = this.rows;

		this.$nextTick( ( ) => {
			this.matchHeight('.space-table-header');
			this.applyStyles('.filter-container',{
				position : 'absolute',
				bottom   : '10px'
			})
		} );
	},

	computed : {

		activeRows() {

			const activeRows = [];

			for ( let i = this.firstRowInView; i < this.lastRowInView; i++ ) { // eslint-disable-line

				if ( this.filteredRows[i] !== undefined ) {
					activeRows.push( this.filteredRows[i] );
				}

			}

			return activeRows;

		},

		firstRowInView() {

			return this.pageLength * ( this.activePage );

		},

		lastRowInView() {

			return this.firstRowInView + this.pageLength;

		},

		noOfPages() {

			return Math.ceil( this.filteredRows.length / this.pageLength );

		},

		settings() {

			let options        = this.options;
			const defaultOptions = {
				selectable         : false,
				loadingText        : 'No Data',
				searchPlaceHolder  : 'Search',
				selectedButtonText : 'Continue',
				uniqueKey          : null
			};

			if ( !options ) {
				options = {};
			}

			const settings = Object.assign( defaultOptions, options );

			if ( settings.selectable && !settings.uniqueKey ) {
				throw new Error( 'Selectable tables must specify a uniqueKey property in options.' );
			}

			return settings;

		},

		indexedRows() {

			if ( !this.settings.selectable ) {
				return;
			}

			const indexedRows = {};
			const key         = this.settings.uniqueKey;

			for ( const i in this.filteredRows ) { // eslint-disable-line

				const row = this.filteredRows[i];

				if ( !row.hasOwnProperty( key ) ) { // eslint-disable-line
					throw new Error( 'All data elements in your table must have the unique key specified in the table options' );
				}

				indexedRows[row[key]] = row;

			}

			return indexedRows; // eslint-disable-line

		},

		selectedRows() {

			const rows = [];

			for ( const i in this.selectedMap ) { // eslint-disable-line

				if ( this.selectedMap[i] ) {
					rows.push( this.indexedRows[i] );
				}

			}

			return rows;

		},

		cols() {

			/* Order all of the columns */
			const columns             = this.objToArray( this.columns );
			const orderedColumns      = [];
			const positionTaken       = {};
			const unorderedColumns    = [];
			const initialColumnsEmpty = this.isEmptyObject( this.initialColumns );

			/* If noDataText exists, then use that. Else no Data */
			const noDataText = this.noDataText;


			// first, sort the columns into those with an
			// order and those without
			columns.forEach( ( column ) => {

				if ( column.order !== undefined ) {

					// check if there is a conflict in orders
					// e.g. two columns have the same order
					if ( positionTaken[column.order] ) {
						throw new Error( `Column with order ${column.order} already taken` );
					}

					// mark this position as taken
					// and add it into the ordered columns
					positionTaken[column.order] = true;
					orderedColumns.push( column );

					return; // eslint-disable-line

				}

				// this column has no order, and we'll assign
				// it an order based on the orders of the other
				// columns
				unorderedColumns.push( column );

			} );

			let highestFilledOrder = 0;

			const autoOrderedColumns = unorderedColumns.map( ( a, i ) => { // eslint-disable-line

				// start off looking for an opening at
				// the order of the last order where we
				// know that all orders previous to it
				// are taken
				let order = highestFilledOrder;

				while ( positionTaken[order] ) {

					order++; // eslint-disable-line

				}

				// indicate the now highest filled order
				// and set that to the position of this
				// column
				highestFilledOrder = order;
				a.order            = order; // eslint-disable-line

				positionTaken[order] = true;

				return a;

			} );

			// combine the explicitly ordered columns with
			// the columns which we ordered manually and then
			// sort them
			const sortedColumns = orderedColumns.concat( autoOrderedColumns ).sort( ( a, b ) => { // eslint-disable-line
				return a.order - b.order;
			} );

			// const shownColumns = sortedColumns.filter( a => this.shown[a.key] );

			// trigger update of inpuFilters
			this.updateInputFilters( columns );

			// finally, we'll fill in all of the default properties
			// of the columns
			return sortedColumns.map( ( a ) => {

				const defaultColumn = {
					default     : noDataText,
					name        : '',
					class       : '',
					columnClass : '',
					style       : {},
					width       : 1
				};

				const defaultedColumn = Object.assign( defaultColumn, a );

				if ( defaultedColumn.width === 'min' ) {
					defaultedColumn.class += ' min-width';
				}

				const w = defaultedColumn.width;

				defaultedColumn.style.flex = `${w} ${w} 0`;

				if ( defaultedColumn.type === 'control' || defaultColumn.type === 'icon' ) {
					defaultedColumn.style.flex = '0 0 auto';
				}

				return defaultedColumn;

			} );

		}

	},

	props : {
		'columns' : {
			required : true,
			type     : Object
		},
		'data' : {
			required : true,
			type     : [Object, Array]
		},
		'reset-on' : {
			default : null
		},
		'style-icon' : {
			default : null
		},
		'render' : {
			default : null
		},
		'controls' : {
			default : null
		},
		'options' : {
			type : Object
		},
		'hover-text' : {
			default : () => ( {} ),
		},
		'sort' : {
			default() {
				return {};
			}
		},
		'title' : {
			default : () => ( {} ),
		},
		'showFilters' : {
			default : false
		},
		'showExport' : {
			default : false
		},
		'initialColumns' : {
			default : () => ( {} )
		},
		'columnPackages' : {
			default : () => ( [] )
		},
		'noData' : {
			default : 'No Data'
		}
	}

} );
