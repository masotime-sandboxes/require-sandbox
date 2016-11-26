var Module = require('module');
var chokidar = require('chokidar');
var original_load = Module._load;
var watchers = {}; // a list of watcher objects

function initWatcher(root, watchTree) {
	var watcher = chokidar.watch(root);

	watcher.on('change', path => {
		if (watchTree[path]) {
			console.log(`[${root}] A change was detected on dependency ${path}`);

			// clear the entire tree, including the root itself
			Object.keys(watchTree).forEach(file => {
				console.log(`[${root}] Resetting ${file}`);
				delete watchTree[file];
				delete require.cache[file];
				watcher.unwatch(file);
			});

			// rewatch the root
			console.log(`[${root}] Rewatching ${root}`);
			watchTree[root] = [];
			watcher.add(root);
		}
	});

	return {
		add(path) { watcher.add(path) },
		end() { watcher.close() }
	};

}

function watch(path) {
	if (watchers[path]) return;

	// intiialze a watchTree with the current path
	var watchTree = {};
	watchTree[path] = [];

	// track this particular tree
	watchers[path] = {
		watchTree: watchTree,
		root: path,
		watcher: initWatcher(path, watchTree)
	};
}

Module._load = function shim_load(request, parent, isMain) {
	var requirePath = Module._resolveFilename(request, parent);
	var parentPath = parent && parent.filename;

	if (parentPath) {
		// we must check with the watchTree of all watchers. If any of the watchTrees
		// has this parentPath, then we must push this dependency into that watchTree
		var watchPaths = Object.keys(watchers);
		watchPaths.forEach(function (watchPath) {
			var watcher = watchers[watchPath];
			var parentDeps = watcher.watchTree[parentPath];

			// if the parent is part of the tree, and the child hasn't
			// been added yet
			if (parentDeps && parentDeps.indexOf(requirePath) < 0) {
				// we need to track this file
				parentDeps.push(requirePath);
				watcher.watcher.add(requirePath);

				// the file also becomes a potential parent of more children
				// to watch
				watcher.watchTree[requirePath] = [];
			}
		});
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
watch(require.resolve('main/unrelated'));

// mimic a continuous request on some modules
setInterval(() => {
	require('main/test');
	require('main/unrelated');
}, 1000);