
/* ------------- dependencies ------------- */

const express = require( 'express' );
const path    = require( 'path' );

const app = express();

const router = express.Router();

// VIEW ENGINE //
app.set('views', path.join( __dirname, 'views' ));                       // use ./views as views directory
app.set('view engine', 'pug');                                           // use pug as our templating engine

app.get('/', function( req, res, next ) {
	res.render('space-table-example', {
		title : "Space Table Example"
	});
});

// RESOURCES //
app.use('/static', express.static( __dirname + '/dist') );             // serve requests to /static from /dist

/* wrap application instantiation inside SQL connection to provide
 global connection pool */

const port = process.env.PORT || 5400;

/* ---------------- create ---------------- */

app.listen( port , () => console.log( `non-secure server on port ${port}` ) );

