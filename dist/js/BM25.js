/* eslint-disable */
const BM25 = (function(){

	let self = this;

	// what we aim to populate
	self.terms     = {};
	self.documents = {};

	// stemmer algorithm
	self.stemmer = (function(){

		let step2list = {
				"ational" : "ate",
				"tional" : "tion",
				"enci" : "ence",
				"anci" : "ance",
				"izer" : "ize",
				"bli" : "ble",
				"alli" : "al",
				"entli" : "ent",
				"eli" : "e",
				"ousli" : "ous",
				"ization" : "ize",
				"ation" : "ate",
				"ator" : "ate",
				"alism" : "al",
				"iveness" : "ive",
				"fulness" : "ful",
				"ousness" : "ous",
				"aliti" : "al",
				"iviti" : "ive",
				"biliti" : "ble",
				"logi" : "log"
			},

			step3list = {
				"icate" : "ic",
				"ative" : "",
				"alize" : "al",
				"iciti" : "ic",
				"ical" : "ic",
				"ful" : "",
				"ness" : ""
			},

			c = "[^aeiou]",          // consonant
			v = "[aeiouy]",          // vowel
			C = c + "[^aeiouy]*",    // consonant sequence
			V = v + "[aeiou]*",      // vowel sequence

			mgr0 = "^(" + C + ")?" + V + C,                    // [C]VC... is m>0
			meq1 = "^(" + C + ")?" + V + C + "(" + V + ")?$",  // [C]VC[V] is m=1
			mgr1 = "^(" + C + ")?" + V + C + V + C,            // [C]VCVC... is m>1
			s_v  = "^(" + C + ")?" + v;                        // vowel in stem

		return function (w) {

			var stem,         //
				suffix,       //
				firstch,      // first character
				re,           // regular expression
				re2,          // regular expression
				re3,          //
				re4,          //
				origword = w; // cache original word

			// w cannot be condensed
			if (w.length < 3) { return w; }

			firstch = w.substr(0,1);

			// y at beginning of word is always consonant
			if (firstch == "y") {
				w = firstch.toUpperCase() + w.substr(1);
			}

			// Step 1a - match plurals
			re  = /^(.+?)(ss|i)es$/;
			re2 = /^(.+?)([^s])s$/;

			if (re.test(w)) { w = w.replace(re,"$1$2"); }
			else if (re2.test(w)) {	w = w.replace(re2,"$1$2"); }

			// Step 1b - determine tense
			re  = /^(.+?)eed$/;
			re2 = /^(.+?)(ed|ing)$/;

			// present
			if (re.test(w)) {
				var fp = re.exec(w);
				re = new RegExp(mgr0);// [C]VC
				if (re.test(fp[1])) {
					re = /.$/;
					w = w.replace(re,"");
				}
			}

			// past or present progressive
			else if (re2.test(w)) {
				var fp = re2.exec(w);
				stem = fp[1];
				re2 = new RegExp(s_v);
				if (re2.test(stem)) {
					w = stem;
					re2 = /(at|bl|iz)$/;
					re3 = new RegExp("([^aeiouylsz])\\1$");
					re4 = new RegExp("^" + C + v + "[^aeiouwxy]$");
					if (re2.test(w)) {	w = w + "e"; }
					else if (re3.test(w)) { re = /.$/; w = w.replace(re,""); }
					else if (re4.test(w)) { w = w + "e"; }
				}
			}

			// Step 1c
			re = /^(.+?)y$/;
			if (re.test(w)) {
				var fp = re.exec(w);
				stem = fp[1];
				re = new RegExp(s_v);
				if (re.test(stem)) { w = stem + "i"; }
			}

			// Step 2
			re = /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/;
			if (re.test(w)) {
				var fp = re.exec(w);
				stem = fp[1];
				suffix = fp[2];
				re = new RegExp(mgr0);
				if (re.test(stem)) {
					w = stem + step2list[suffix];
				}
			}

			// Step 3
			re = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;
			if (re.test(w)) {
				var fp = re.exec(w);
				stem = fp[1];
				suffix = fp[2];
				re = new RegExp(mgr0);
				if (re.test(stem)) {
					w = stem + step3list[suffix];
				}
			}

			// Step 4
			re = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;
			re2 = /^(.+?)(s|t)(ion)$/;
			if (re.test(w)) {
				var fp = re.exec(w);
				stem = fp[1];
				re = new RegExp(mgr1);
				if (re.test(stem)) {
					w = stem;
				}
			} else if (re2.test(w)) {
				var fp = re2.exec(w);
				stem = fp[1] + fp[2];
				re2 = new RegExp(mgr1);
				if (re2.test(stem)) {
					w = stem;
				}
			}

			// Step 5
			re = /^(.+?)e$/;
			if (re.test(w)) {
				var fp = re.exec(w);
				stem = fp[1];
				re = new RegExp(mgr1);
				re2 = new RegExp(meq1);
				re3 = new RegExp("^" + C + v + "[^aeiouwxy]$");
				if (re.test(stem) || (re2.test(stem) && !(re3.test(stem)))) {
					w = stem;
				}
			}

			re = /ll$/;
			re2 = new RegExp(mgr1);
			if (re.test(w) && re2.test(w)) {
				re = /.$/;
				w = w.replace(re,"");
			}

			// and turn initial Y back to y

			if (firstch == "y") {
				w = firstch.toLowerCase() + w.substr(1);
			}

			return w;
		}
	})();

	// static stop words list
	let stopWords = ["a","about","above","across","after","afterwards","again","against","all","almost","alone","along","already","also","although","always","am","among","amongst","amoungst","amount","an","and","another","any","anyhow","anyone","anything","anyway","anywhere","are","around","as","at","back","be","became","because","become","becomes","becoming","been","before","beforehand","behind","being","below","beside","besides","between","beyond","bill","both","bottom","but","by","call","can","cannot","cant","co","computer","con","could","couldnt","cry","de","describe","detail","do","done","down","due","during","each","eg","eight","either","eleven","else","elsewhere","empty","enough","etc","even","ever","every","everyone","everything","everywhere","except","few","fifteen","fify","fill","find","fire","first","five","for","former","formerly","forty","found","four","from","front","full","further","get","give","go","had","has","hasnt","have","he","hence","her","here","hereafter","hereby","herein","hereupon","hers","herse","","him","himse","","his","how","however","hundred","i","ie","if","in","inc","indeed","interest","into","is","it","its","itse","","keep","last","latter","latterly","least","less","ltd","made","many","may","me","meanwhile","might","mill","mine","more","moreover","most","mostly","move","much","must","my","myse","","name","namely","neither","never","nevertheless","next","nine","no","nobody","none","noone","nor","not","nothing","now","nowhere","of","off","often","on","once","one","only","onto","or","other","others","otherwise","our","ours","ourselves","out","over","own","part","per","perhaps","please","put","rather","re","same","see","seem","seemed","seeming","seems","serious","several","she","should","show","side","since","sincere","six","sixty","so","some","somehow","someone","something","sometime","sometimes","somewhere","still","such","system","take","ten","than","that","the","their","them","themselves","then","thence","there","thereafter","thereby","therefore","therein","thereupon","these","they","thick","thin","third","this","those","though","three","through","throughout","thru","thus","to","together","too","top","toward","towards","twelve","twenty","two","un","under","until","up","upon","us","very","via","was","we","well","were","what","whatever","when","whence","whenever","where","whereafter","whereas","whereby","wherein","whereupon","wherever","whether","which","while","whither","who","whoever","whole","whom","whose","why","will","with","within","without","would","yet","you","your","yours","yourself","yourselves"]
	// tokenize function
	self.tokenize = function( text, keepStopWords = false ) {

		// strip weird characters, separate into words,
		// and run stemmer algorithm on each word
		text = text
			.toLowerCase()
			.replace(/\W/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
			.split(' ')
			.map(function(a) { return self.stemmer(a); });

		let out = [];

		for ( let i = 0; i < text.length; i ++ ) {

			if ( keepStopWords || stopWords.indexOf(text[i]) == -1 )
				out.push( text[i] );

		}

		return out;

	}

	/*
	 * used in later calculations
	 */
	self.totalDocuments          = 0;
	self.totalDocumentTermLength = 0;
	self.averageDocumentLength   = 0;

	self.addDocument = function( doc, id ) {

		if ( !doc.hasOwnProperty("body") ) {

			switch ( typeof doc ) {

				case "string" :

					doc = { body: doc };

					break;

				case "object" :

					let newDoc = { body: "" };

					for ( let i in doc ) {

						if ( typeof doc[i] == "string" )
							newDoc.body += " " + doc[i]

					}

					doc = newDoc;

					break;

				default:

					throw new Error(1002, 'No indexable document body supplied or inferred. Documents must be of type String, or Object')

			}

		}

		if ( typeof id === 'undefined' )
			throw new Error(1000, 'ID is a required property of documents.');

		if ( typeof doc.body === 'undefined' )
			throw new Error(1001, 'Body is a required property of documents.');

		// Raw tokenized list of words
		var tokens = self.tokenize(doc.body);

		// Will hold unique terms and their counts and frequencies
		var _terms = {};

		// docObj will eventually be added to the documents database
		var docObj = {id: id, tokens: tokens, body: doc.body};

		// Count number of terms
		docObj.termCount = tokens.length;

		// Increment totalDocuments
		self.totalDocuments++;

		// Readjust averageDocumentLength
		self.totalDocumentTermLength += docObj.termCount;
		self.averageDocumentLength = self.totalDocumentTermLength / self.totalDocuments;

		// Calculate term frequency
		// First get terms count
		for (var i = 0, len = tokens.length; i < len; i++) {
			var term = tokens[i];
			if (!_terms[term]) {
				_terms[term] = {
					count: 0,
					freq: 0
				};
			};
			_terms[term].count++;
		}

		// Then re-loop to calculate term frequency.
		// We'll also update inverse document frequencies here.
		var keys = Object.keys(_terms);
		for (var i = 0, len = keys.length; i < len; i++) {

			var term = keys[i];
			// Term Frequency for this document.
			_terms[term].freq = _terms[term].count / docObj.termCount;

			// Inverse Document Frequency initialization
			if (!self.terms[term]) {
				self.terms[term] = {
					n       : 0, // Number of docs this term appears in, uniquely
					idf     : 0,
					foundIn : []
				};
			}

			self.terms[term].n++;
			self.terms[term].foundIn.push( id );

		};

		// Calculate inverse document frequencies
		// This is SLOWish so if you want to index a big batch of documents,
		// comment this out and run it once at the end of your addDocuments run
		// If you're only indexing a document or two at a time you can leave this in.
		// this.updateIdf();

		// Add docObj to docs db
		docObj.terms = _terms;
		self.documents[docObj.id] = docObj;

	};

	return self;

});
