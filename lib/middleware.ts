///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/vinyl-fs/vinyl-fs.d.ts" />
import * as path from 'path';
import * as vfs from 'vinyl-fs';
const sourcemaps = require('gulp-sourcemaps');
const plumber = require('gulp-plumber');
const postcss = require('gulp-postcss');
const concat = require('gulp-concat');
const tap = require('gulp-tap');
const gulpif = require('gulp-if');

const ERROR_PREFIX = '[postcss-middleware]';

// ReSharper disable once InconsistentNaming
// ReSharper disable once UnusedLocals
// ReSharper disable RedundantQualifier
function PostCssMiddleware(options: PostCssMiddleware.Options = <any>{}) {
	// ReSharper enable RedundantQualifier

	if (!options.plugins) {
		throw new Error(`${ERROR_PREFIX} missing required option: plugins`);
	}

	if (!Array.isArray(options.plugins)) {
		throw new TypeError(`${ERROR_PREFIX} plugins option must be an array`);
	}

	if (options.src && typeof options.src !== 'function') {
		throw new TypeError(`${ERROR_PREFIX} src option must be a function`);
	}

	const src = options.src || (req => path.join(__dirname, req.url));

	return (req, res, next: Function) => {
		if (req.method !== 'GET' && req.method !== 'HEAD') {
			next();
			return;
		}

		const globs = src(req);
		if (typeof globs !== 'string' && !Array.isArray(globs)) {
			next(new TypeError(`${ERROR_PREFIX} src callback must return a glob string or array`));
			return;
		}

		let isFileFound = false;
		vfs.src(globs)
			.pipe(plumber({ errorHandler: next }))
			.pipe(gulpif(options.inlineSourcemaps, sourcemaps.init()))
				.pipe(postcss(options.plugins))
				.pipe(concat('.css'))
			.pipe(gulpif(options.inlineSourcemaps, sourcemaps.write()))
			.pipe(tap(file => {
				isFileFound = true;
				res.writeHead(200, {
					'Content-Type': 'text/css'
				});
				res.end(file.contents);
			}))
			.on('end', () => {
				if (!isFileFound) {
					next();
				}
			});
	};
}

module PostCssMiddleware {
	export interface Options {
		/**
		 * An array of PostCSS plugins.
		 */
		plugins: Function[];
		/**
		 * Build the file path to the source file(s) you wish to read.
		 */
		src?:
		/**
		 * @param request The Express app's request object.
		 * @returns A glob string or an array of glob strings. All files matched
		 * will be concatenated in the response.
		 */
		(request: any) => string|string[];
		/**
		 * Generate inlined sourcemaps.
		 */
		inlineSourcemaps?: boolean;
	}
}

export default PostCssMiddleware;
