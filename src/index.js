var Module = require('module');
var chokidar = require('chokidar');
var original_load = Module._load;
var watchTree = {};

function initWatcher() {
	var watcher = chokidar.watch();

	watcher.on('change', path => {
		if (watchTree[path]) {
			console.log(`A change was detected on a related file ${path}`);

			// aggregate all files with the same root
			var commonRoot = watchTree[path].root;
			var filesToClear = [];
			Object.keys(watchTree).forEach(file => {
				if (watchTree[file].root === commonRoot) {
					filesToClear.push(file);
				}
			});

			// delete all the files in the cache. this will also delete the root
			filesToClear.forEach(file => {
				console.log(`Reseting ${file}`);
				delete watchTree[file];
				delete require.cache[file];
			});

			// remove this watcher and rewatch the root
			console.log(`Rewatching ${commonRoot}`);
			watcher.close();
			watch(commonRoot);
		}
	});

	return {
		add(path) { watcher.add(path) },
		end() { watcher.close() }
	};

}

function watch(path) {
	// if the path is not already in the tree
	if (!watchTree[path]) {
		watchTree[path] = [];
		watchTree[path].root = path;
		watchTree[path].watcher = initWatcher();
	}
	
	return require(path);
}

Module._load = function shim_load(request, parent, isMain) {
	var requirePath = Module._resolveFilename(request, parent);
	var parentDeps = parent && parent.filename && watchTree[parent.filename];
	if (parentDeps && parentDeps.indexOf(requirePath) < 0) {
		// we need to track this file
		parentDeps.push(requirePath);

		// we also enable tracking of dependencies of this file
		watchTree[requirePath] = [];
		watchTree[requirePath].root = parentDeps.root;
		parentDeps.watcher.add(requirePath);

	}

	return original_load(request, parent, isMain);
}



/*
module.require = function(...args) {
	console.log(`detected that ${args[0]} is required`);
	return originalRequire(...args);
}

require(__dirname + '/main/test');
*/

watch(require.resolve('main/test'));
// watch(require.resolve('main/unrelated'));

// mimic a continuous request on some modules
setInterval(() => {
	require('main/test');
	require('main/unrelated');
}, 1000);

console.log(JSON.stringify(watchTree, null, 4));