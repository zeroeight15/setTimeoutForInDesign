#target "InDesign"
#targetengine "myOwnEngineName"

	/**
	 * setTimeout
	 * Version 1.0
	 * A setTimeout function implementation for InDesign ExtendScript like known from a Browser's Javascript.
	 * Uses InDesign's idleTask stuff.
	 * Timeout milliseconds are not accurate, but it allows to call a heavy load script,
	 * split it up into small junks for InDesign is not blocked too long and has time to breath.
	 *
	 * The script MUST run in its dedicated target engine:
	 * #target "InDesign"
	 * #targetengine "myOwnEngineName"
	 *
	 * DISCLAIMER:
	 * No warranty - use as is or modify but retain the originator's coordinates:
	 * CopyRight Andreas Imhof, www.aiedv.ch, ai@aiedv.ch
	 */
	//
	var setTimeout_Task_curfile = new File($.fileName),
	setTimeout_Task_curfullname = decodeURI(setTimeout_Task_curfile.name),
									// setTimeout_Taskname must be a UNIQUE name, so we take it from the current running script!! 
									// May be set to any String like
									// setTimeout_Taskname = 'myOwnTask';
	setTimeout_Taskname = setTimeout_Task_curfullname.lastIndexOf(".") > 0 ? (setTimeout_Task_curfullname.substr(0,setTimeout_Task_curfullname.lastIndexOf("."))) : setTimeout_Task_curfullname,

	setTimeout_Tasks = {},	// all defined tasks prepared to run
	/**
	 * setTimeout_hasIdleTask
	 * Utility function
	 * @param {Number} the timeout task id
	 * @return {Boolean} true if a given timeout id also has his attached idleTask
	 */
	setTimeout_hasIdleTask = function(id) {
		var has = false, i;
		for (i = 0; i < app.idleTasks.length; i++) {
			//alert("id: " + id + " tid: " + app.idleTasks[i].label);
			if (app.idleTasks[i].isValid && (app.idleTasks[i].id === id)) {
				has = true;
				break;
			}
		}
		return has;
	},
	/**
	 * setTimeoutList
	 * Utility function
	 * @return {String} a list of all currently active setTimeout_Tasks
	 */
	setTimeoutList = function() {
		var list = "", cb,
			k;
		for (k in setTimeout_Tasks) {
			if (list !== "") list += ",";
			cb = setTimeout_Tasks[k]["cb"].toString();
			cb = cb.replace(/\s/g,"");
			list += setTimeout_Tasks[k]["taskid"] + ":" + cb;
		}
		return list;
	},
	/**
	 * idleTasksList
	 * Utility function
	 * @return {String} a list of all currently active idleTasks
	 */
	idleTasksList = function() {
		var list = "",
			k;
		for (k = 0; k < app.idleTasks.length; k++) {
			if (list !== "") list += ",";
			list += app.idleTasks[k].id + ":" + setTimeout_hasIdleTask(app.idleTasks[k].id) + ":" + app.idleTasks[k].label;
		}
		return list;
	},
	/**
	 * setTimeoutInit
	 * Init/clean the timeout system
	 */
	setTimeoutInit = function() {
		var it;
		// remove all (erroneous) idleTasks
		//alert("set idleTasks: " + app.idleTasks.length);
		//NA: logmess("setTimeoutInit set idleTasks: " + app.idleTasks.length + "\n");
		for (it = 0; it < app.idleTasks.length; it++) {
			if (app.idleTasks[it].label == setTimeout_Taskname) {
				//alert("removing idleTask id " + app.idleTasks[it].id + " label: " + app.idleTasks[it].label);
				clearTimeout(app.idleTasks[it].id);
			}
		}
		setTimeout_Tasks = {};
	},
	/**
	 * Tasks Handler
	 * Check if a task can be called now
	 * @param {Number} taskid
	 * @return {Boolean} always false
	 */
	setTimeoutHandler = function(taskid) {
		var now_Ticks = new Date().getTime(),
			cb, cb_retval = undefined;

		try {
			//alert("taskid: " + taskid + "\nnumcalls: " + setTimeout_Tasks[taskid]["numcalls"]);
			// we look for well timed call only!!!	CS6 calls at start AND after the timeout
			if (setTimeout_Tasks[taskid]["end_ticks"] > now_Ticks) {	// we have not reached timeout
				//NA: logmess("setTimeoutHandler id " +  taskid + " too early by ms: " + (setTimeout_Tasks[taskid]["end_ticks"] - now_Ticks) + "\n");
				//alert("setTimeoutHandler id " +  taskid + " too early by ms: " + (setTimeout_Tasks[taskid]["end_ticks"] - now_Ticks));
				setTimeout_Tasks[taskid]["numcalls"] += 1;
				return false;	// wait for next call
			}
		}
		catch(ex) {
			alert("Exception (1) in function 'setTimeoutHandler()', taskid " + taskid + ":\n" + ex);
		}

		try {
			cb = setTimeout_Tasks[taskid]["cb"];	// store the callback
			clearTimeout(taskid);	// remove the timeout
		}
		catch(ex) {
			alert("Exception (2) in function 'setTimeoutHandler()', taskid " + taskid + ":\n" + ex);
		}

		try {
			//NA: logmess("setTimeoutHandler call " +  cb + "\n");
			cb_retval = cb();	// call the cb
			//if (cb_retval) alert("cb_retval:\n" + cb_retval);
		} catch(ex) {
			alert("Exception in function '" + cb() + ":\n" + ex);
		}

		return false;
	},
	/**
	 * setTimeout
	 * Set a function to called after the given timeout
	 * @param {function} callback the function to call
	 * @param {Number} timeout in ms
	 * @return {Boolean} null on error, otherwise the id (can be used with clearTimeout
	 */
	setTimeout = function(callback,timeout) {
		try {
			var idle_Task,
				now_Ticks = new Date().getTime();
			idle_Task = app.idleTasks.add({sleep:timeout});
			idle_Task.label = setTimeout_Taskname;
			setTimeout_Tasks[idle_Task.id] = {
				"label": setTimeout_Taskname,
				"start_ticks": now_Ticks,
				"sleep": timeout,
				"end_ticks": now_Ticks + timeout,
				"cb": callback,
				"taskid": idle_Task.id,
				"numcalls": 0
				};
			setTimeout_Tasks[idle_Task.id].handler = function(ev){setTimeoutHandler(setTimeout_Tasks[idle_Task.id]["taskid"]);};
			idle_Task.addEventListener(IdleEvent.ON_IDLE, setTimeout_Tasks[idle_Task.id].handler,false);
			//NA: logmess("setTimeout idle_Task.id: " + idle_Task.id + ", timeout: " + timeout + "\ncallback: " + callback + "\n");
			return idle_Task.id;
		}
		catch(ex) {
			alert("Exception in function 'setTimeout()':\n" + ex);
		}
		return null;
	},
	/**
	 * clearTimeout
	 * Clear the timeout given by the setTimeout return value
	 * @param {Number} id the timeout id to clear
	 */
	clearTimeout = function (id){
		var i, task = null;
		for (i = 0; i < app.idleTasks.length; i++) {
			//alert("id: " + id + " tid: " + app.idleTasks[i].label);
			if ((app.idleTasks[i].id == id) && app.idleTasks[i].isValid) {
				task = app.idleTasks[i];
				break;
			}
		}

		if (task !== null) {
			try {
				if (setTimeout_Tasks[id] && setTimeout_Tasks[id].handler) {
					// this kills any!!!    app.idleTasks.itemByID(id).removeEventListener(IdleEvent.ON_IDLE, setTimeout_Tasks[id].handler,false);
					task.removeEventListener(IdleEvent.ON_IDLE, setTimeout_Tasks[id].handler,false);
				}
				// this kills any!!!    app.idleTasks.itemByID(id).remove();
				//task.remove();
				task.sleep = 0;
			}
			catch(ex) {
				alert("Exception in function 'clearTimeout() idleTasks':\n" + ex);
			}
			try {
				delete setTimeout_Tasks[id];
			}
			catch(ex) {
				alert("Exception in function 'clearTimeout() delete setTimeout_Tasks':\n" + ex);
			}
		}
	};
	/**
	 * Init/clean the timeout system
	 */
	setTimeoutInit();
	// alert(setTimeout_Taskname);	// Just to check if the 'setTimeout_Taskname' was set correctly

setTimeout(function(){alert("here I am after 3 secs");},3000);
setTimeout(function(){alert("here I am after 10 secs");},10000);
setTimeout(function(){alert("here I am after 30 secs");},30000);
