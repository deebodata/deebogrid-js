var helper = {}
helper.methods = function() {

    var home = {}
    return function() {
        home = {

            currXlSheet: null,
            xlSheets: {},//xl sheets can have multiple books

            emptyCurrFileVal: function(event) {
                try{
                    event.target.value = ""
                    event.target.files = []
                }catch(e){}
            },

            clearDataGridMemory: function(clearAllSheets) {
                document.getElementById("dataTableHeaders").innerHTML = ""
                const dtBody = document.getElementById("dataTableBody")
                if(dtBody){
                    dtBody.innerHTML = ""
                    dtBody.scrollTop = 0
                    deebo.methods.resetTblBody(dtBody)
                }
                deebo.methods.clearValidatedEdit(null, true)
                if(deebo.methods.rowNumbers)
                    try{ document.getElementById("rowNumBody").innerHTML = ""}catch(e){}
                document.getElementById("dataTableChecks").innerHTML = ""
                document.getElementById("btnReset").disabled = true;
                dataTableService.methods.sortOrder = []
                if(clearAllSheets){
                    helper.methods.xlSheets = {}
                    helper.methods.removeBtnSwitchSheets()
                }
                dataTableService.methods.currMapping = {}
                deebo.methods.clearSortInds()
                deebo.methods.clickAllBtnFilXs()
                deebo.methods.clearHiddenCols()
                deebo.methods.clearSelectedRows()
                dataTableService.methods.mainData = []
                dataTableService.methods.currFilData = []
                dataTableService.methods.mainDataLen = 0
                deebo.methods.lastElRowIndex = 0
                deebo.methods.currColumnEdit = null
                deebo.methods.linkCell = null
                deebo.methods.columnNames = []
                dataTableService.methods.visibleCols = []
                deebo.methods.waitingInsightGraphs = {}
                dataTableService.methods.firstCol = ""
                dataTableService.methods.currMapping = {}
                dataTableService.methods.mapperWorkerId = 1
                dataTableService.methods.displayOnlySelRows = false
                dataTableService.methods.dataFilSrtTracker = null
                deebo.methods.linkCells = []
                deebo.methods.currEditCol = ""
                deebo.methods.showCharts = false
                deebo.methods.currEditIndex = -1
            },

            enactHoverOnBtnFile: function(e) {
                const type = e.type
                const el = document.getElementsByClassName("btn-file-select")[0]
                if(el){
                    if(type === "mouseenter")
                        el.classList.add("mock-button-hover")
                    if(type === "mouseleave" || type === "blur")
                        el.classList.remove("mock-button-hover")
                }
            },

            setDataGrid: function(data) {
                dataTableService.methods.mainData = data.filter( function(d) { return true })
                dataTableService.methods.currFilData = data.filter( function(d) { return true })
                dataTableService.methods.mainDataLen = dataTableService.methods.mainData.length
                deebo.methods.buildInitUiDataTable(data)
            },

            handleFileSelect: function(event) {
                if(event && event.target){
                    const file = event.target.files[0]
                    const ext = file.name.substring(file.name.lastIndexOf('.') + 1).toLocaleLowerCase();
                    const reader = new FileReader()
                    const allowedFileExt = ["csv", "xls", "xlsx", "xlsb"];
                    reader.onload = function(onLevt) {
                        if(allowedFileExt.indexOf(ext) > -1){
                            try{
                                helper.methods.clearDataGridMemory(true)
                                const raw = reader.result.replace(/data:(application|text)\/(csv|vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|octet-stream);base64,/g, "")
                                let data;
                                if(ext === "csv"){
                                    data = helper.methods.extractFileData(helper.methods.parseFlatFile(atob(raw).toString(), ","))
                                } else {
                                    var workbook = XLSX.read(raw, { type: 'base64' });
                                    workbook.SheetNames.forEach(function(sheetName) {
                                        var XL_row_object = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
                                        helper.methods.xlSheets[sheetName] = XL_row_object.filter( function(r) { return true })
                                        if(!data){//get first one
                                            data = helper.methods.extractFileData(XL_row_object, sheetName)
                                            helper.methods.currXlSheet = sheetName
                                        }
                                        helper.methods.buildSheetsMenu(sheetName)
                                    })
                                }
                                if(data)
                                    return helper.methods.setDataGrid(data)
                                deebo.methods.setLoading("No data in " + file.name + " can be tabulated.")
                            } catch(ex) {
                                deebo.methods.setLoading(ex.message || "We're sorry, but we encountered an error.")
                            }
                        } else {
                            deebo.methods.setLoading("Files must be one of - " + allowedFileExt.join(", "))
                        }
                    };
                    reader.onerror = function(onEevt) {return deebo.methods.setLoading("An error occurred reading your "+ ext +" file. Please try again.") }
                    reader.readAsDataURL(file)
                    deebo.methods.setLoading()
                }
            },

            extractFileData: function(data) {//find the array
                if(data && data.length && data[0] && typeof data.filter === "function")//we have an array
                    return deebo.methods.convertNeededCols(helper.methods.stripObjAllNull(data))
                let initProp;
                let arrsCount = 0
                try{
                    if(typeof data === "string")
                        data = JSON.parse(data)
                    for(const prop in data){
                        if(data[prop]){
                            if(typeof data[prop].filter === "function"){//its an array
                                if(!data[prop].length)
                                    continue
                                arrsCount += 1
                                if(!initProp)
                                    initProp = prop
                                if(!helper.methods.xlSheets[prop] || typeof helper.methods.xlSheets[prop] === "undefined")
                                    helper.methods.xlSheets[prop] = helper.methods.stripObjAllNull(data[prop])
                                helper.methods.buildSheetsMenu(prop)
                            } else {
                                if(typeof data[prop] === "object"){
                                    for(const sprop in data[prop]){
                                        if(data[prop][sprop]){
                                            if(typeof data[prop][sprop].filter === "function"){//its an array
                                                if(!data[prop][sprop].length)
                                                    continue
                                                arrsCount += 1
                                                if(!initProp)
                                                    initProp = sprop
                                                if(!helper.methods.xlSheets[sprop] || typeof helper.methods.xlSheets[sprop] === "undefined")
                                                    helper.methods.xlSheets[sprop] = helper.methods.stripObjAllNull(data[prop][sprop])
                                                helper.methods.buildSheetsMenu(sprop)
                                            } else {
                                                if(typeof data[prop][sprop] === "object"){
                                                    for(const tprop in data[prop][sprop]){
                                                        if(data[prop][sprop][tprop]){
                                                            if(typeof data[prop][sprop][tprop].filter === "function"){//its an array
                                                                if(!data[prop][sprop][tprop].length)
                                                                    continue
                                                                arrsCount += 1
                                                                if(!initProp)
                                                                    initProp = tprop
                                                                if(!helper.methods.xlSheets[tprop] || typeof helper.methods.xlSheets[sprop][tprop] === "undefined")
                                                                    helper.methods.xlSheets[tprop] = helper.methods.stripObjAllNull(data[prop][sprop][tprop])
                                                                helper.methods.buildSheetsMenu(tprop)
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if(arrsCount === 1)//just remove it
                        helper.methods.removeBtnSwitchSheets()
                    return deebo.methods.convertNeededCols(helper.methods.xlSheets[initProp])
                }catch(e){}
                return null
            },

            stripObjAllNull: function(data) {//get empty rows in obj data and delete
                if(data && data.some( function(d) { return d && typeof d === "object" })){
                    return data.filter(function(r) { 
                        for(const prop in r)
                            return r[prop] || r[prop] === 0 ? true : false;
                    }).map( function(d) {
                        if(d && typeof d === "object"){
                            let i = 1
                            for(const prop in d){
                                if(d[prop] && (!prop || !prop.trim())){
                                    d["column"+i] = ""
                                    d["column"+i] = d[prop]
                                    delete d[prop]
                                }
                                i += 1
                            }
                        }
                        return d
                    })
                }
                return data.filter(function(r) { return true })
            },

            
            parseFlatFile: function(txt, delim) {
                const lines = txt.split('\n');
                const headers = lines[0].split(delim);
                if(!headers.length || (headers.length <= 1 && lines[0] && lines[0].length > 16))
                    throw new Error("Row 1 of delimited file is not a suitable header row. Please alter your file so that the column headers are in row 1")
                let i = 1//line 0 is headers
                const result = [];
                const len = lines.length
                if(len === 1)//only has headers
                    return ("If this is delimited text, please add at least 1 row under your delimited headers row to proceed.")
                for (i; i < len; i++) {
                    let j = 0;
                    const obj = {};
                    const currentLine = lines[i].split(delim);
                    for (j; j < headers.length; j++){
                        const header = headers[j]
                        obj[header] = currentLine[j];
                    }
                    result.push(obj);
                }
                return result;
            },

            buildSheetsMenu: function(sheetName) {
                const el = document.getElementById("worksheetsList")
                const btn = document.createElement("button")
                btn.type = "button"
                btn.textContent = sheetName
                btn.className = "btn-switch-sheets"
                btn.id = "btn" + sheetName.replace(/ /g, deebo.methods.uniSep)
                if(sheetName === helper.methods.currXlSheet)
                    btn.disabled = true
                btn.onclick = helper.methods.extractFileDataFromSheetOnClick
                el.className = "controls"
                el.insertAdjacentElement("beforeend", btn)
            },

            removeBtnSwitchSheets: function() {
                const ctrls = document.getElementById("worksheetsList")
                const els = document.getElementsByClassName("btn-switch-sheets")
                const len = els.length
                for(var i = (len-1); i >= 0; i--)
                    ctrls.removeChild(els[i])
                ctrls.className = "hide"
            },

            extractFileDataFromSheetOnClick: function(event) {
                let i = 0
                if(event)
                    helper.methods.currXlSheet = null
                const keys = Object.keys(helper.methods.xlSheets)
                const len = keys.length
                for(i; i < len; i++){
                    const btn = document.getElementById("btn" + keys[i].replace(/ /g, deebo.methods.uniSep))
                    if(btn)
                        btn.disabled = false
                }
                event.target.disabled = true
                helper.methods.clearDataGridMemory()//leave the sheets
                const id = deebo.methods.replaceUniSep(event.target.id.replace(/btn/g, ""))
                helper.methods.currXlSheet = id
                let data = helper.methods.extractFileData(helper.methods.xlSheets[id], id)
                if(data)
                    return helper.methods.setDataGrid(data)
                deebo.methods.setLoading("No data in " + id + " can be tabulated.", true)
            },

        }
        return home
    }()
}()

document.addEventListener('DOMContentLoaded', function() {
    try{
        const dataFile = document.getElementById("dataFile")
        if(dataFile){
            dataFile.addEventListener("change", helper.methods.handleFileSelect)
            dataFile.addEventListener("click", helper.methods.emptyCurrFileVal)
            dataFile.addEventListener("mouseenter", helper.methods.enactHoverOnBtnFile)
            dataFile.addEventListener("mouseleave", helper.methods.enactHoverOnBtnFile)
            dataFile.addEventListener("blur", helper.methods.enactHoverOnBtnFile)
            deebo.methods.setLoading("Choose an Excel or CSV file to get started.")
        }
    }catch(e){ }
})