var deebo = {}
var tblDragEvents = {}
var dataTableService = {}
deebo.methods = function() {

    var home = {}
    return function() {

        home = {

            useColWid: null,
            deboTotal: "deebo_total",
            dTblHeight: 500,
            desRowHeight: "78",
            mouseEventBreak: 960,
            uniSep: "Z_",
            verticalRest: 0,
            horizRest: 0,
            aboveHgt: 0,
            belowHgt: 0,
            useRowWid: "",
            rowNumbers: true,
            lastElRowIndex: 0,
            listenToCellDraggerMouseMove: false,
            currColumnEdit: null,//for drag/resize events
            linkCell: null,
            linkCells: [],
            columnNames: [],
            showCharts: false,
            currEditCol:"",//for cell editing
            currEditIndex: -1,
            uProvidedPrimKey: null,
            editable: true,
            waitingInsightGraphs: {},
            badStrings: ["null", "NULL", "Null", "undefined", "UNDEFINED", "Undefined"],
            statOpts: ["avg", "min", "max", "mode", "median", "sum"],

            getAllColsAtRuntime: function(excludeDuid, excludeHidden) {
                let cols = (typeof dataTableService.methods.mainData[0] === "object" ? Object.keys(dataTableService.methods.mainData[0]) : 
                Object.keys(dataTableService.methods.dataFilSrtTracker));
                if(!excludeHidden)
                    return cols;
                return cols.filter( function(c) { 
                    return !dataTableService.methods.dataFilSrtTracker[c].minimize
                });
            },

            setMaxCols: function(wid) {
                const el = document.getElementById("dataTable")
                if(el){
                    const elWid = el.getBoundingClientRect().width;
                    return elWid >= 1024 ? 5 : (elWid > 760 ? 3 : 2)
                }
                return wid >= 1024 ? 5 : (wid > 760 ? 3 : 2)
            },

            getAllColWidth: function(colLen) {
                try{
                    if(!colLen || colLen === 0)
                        return 0
                    const colWid = parseInt(deebo.methods.useColWid.replace(/[ ]?px/g, ""))
                    let i = 0
                    let wid = 0
                    for(const prop in dataTableService.methods.dataFilSrtTracker){
                        if(dataTableService.methods.dataFilSrtTracker[prop]?.["minimize"])
                            continue
                        i += 1
                        const ownColWid = dataTableService.methods.dataFilSrtTracker[prop]?.["colWidth"]
                        wid += (ownColWid ? parseInt(ownColWid.replace(/[ ]?px/g, "")) : colWid)
                    }
                    if(i === colLen)
                        return Math.floor(wid)
                    return Math.floor(colWid*colLen)
                }catch(e){ 
                    try{
                        return Math.floor(parseInt(deebo.methods.useColWid.replace(/[ ]?px/g, ""))*colLen)
                    }catch(e){
                        return window.innerWidth
                    }
                }
            },

            freezeColOnClick: function(event) {
                event && event.stopPropagation()
                try{
                    const col = event.target.id?.replace(/btnFreeze/g, "") || event.target.parentElement?.id?.replace(/btnFreeze/g, "")
                    const prop = deebo.methods.replaceUniSep(col)
                    const currCol = dataTableService.methods.dataFilSrtTracker[prop]
                    if(col && currCol){
                        dataTableService.methods.dataFilSrtTracker[prop].freeze = !currCol.freeze
                        const nowVal = dataTableService.methods.dataFilSrtTracker[prop].freeze
                        const head = document.getElementById("columnHeader" + col)
                        if(head){
                            if(nowVal)
                                head.classList.add("col-item-freeze")
                            else
                                head.classList.remove("col-item-freeze")
                        }
                        let i = 0
                        const cells = document.getElementsByClassName("data-cell-" + col)
                        const len = cells.length
                        for(i; i < len; i++){
                            if(nowVal)
                                cells[i].classList.add("col-item-freeze")
                            else
                                cells[i].classList.remove("col-item-freeze")
                        }
                    }
                }catch(e){}
            },

            removeAllFreezeCols: function() {
                const fcols = document.getElementsByClassName("col-item-freeze")
                const len = fcols.length
                for(var i = (len-1); i >= 0; i--)
                    try{fcols[i].classList.remove("col-item-freeze")}catch(e){}
            },

            setColHeaderHgt: function() {//set hgt = to tallest
                let z = 0; let i = 0; let x = 0
                let hgts = []
                const cols = document.getElementsByClassName("col-header")
                const cLen = cols.length
                for(x; x < cLen; x++){
                    const col = cols[x]
                    col["style"].removeProperty("height")
                    col["style"].removeProperty("line-height")
                }
                for(z; z < cLen; z++)
                    hgts.push(cols[z].getBoundingClientRect().height)
                const maxHgt = hgts.sort( function(a,b) { return a > b ? -1 : 1 })[0]
                const useHgt = Math.ceil(maxHgt)
                for(i; i < cLen; i++){
                    const col = cols[i]
                    if(col && !col.classList.contains("col-header-minimized")){
                        col["style"]["height"] = useHgt + "px"
                        if(col.firstElementChild.getBoundingClientRect().height < 40)
                            col["style"]["lineHeight"] = Math.floor(((useHgt/2)-21)) + "px"
                    }
                }
                document.getElementById("dataTableHeaders").style.height = useHgt + "px"
                if(deebo.methods.rowNumbers)
                    document.getElementById("rowNumHeader").style.height = useHgt + "px"
                deebo.methods.setRowSelChecksPlacement()
            },

            renameColSpecChars: function(data) {
                if(data && data.some( function(d) { return d && typeof d === "object" })){
                    let specCharCols = []
                    if(data[0] && typeof data[0] === "object"){
                        for(const prop in data[0]){
                            if(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/g.test(prop))
                                specCharCols.push(prop) 
                        }
                        let c = 0
                        let i = 0
                        const dlen = data.length
                        const len = specCharCols.length
                        for(c; c < len; c++){
                            const prop = specCharCols[c]
                            const okNwNam = deebo.methods.stripSpecChars(prop)
                            for(i; i < dlen; i++){
                                if(data[i] && typeof data[i] === "object"){
                                    const desc = Object.getOwnPropertyDescriptor(data[i], prop)
                                    if(desc){
                                        try{
                                            Object.defineProperty(data[i], okNwNam, desc);
                                            delete data[i][prop]
                                        }catch(e){}
                                    }
                                }
                            }
                            i = 0;
                        }
                        return data?.filter( function(d) { return true });
                    }
                    return data?.filter( function(d) { return true });
                }
                return data?.filter( function(d) { return true });
            },

            scoopOutObjsInObjs: function(data) {//scoop out one layer of nested objs
                let i = 0;
                let ndata = []
                const len = data?.length
                if(data && data.some( function(d) { return d && typeof d === "object" })){
                    for(i; i < len; i++){
                        try{
                            const dta = data[i]
                            if(dta && typeof dta === "object"){
                                let nobj = {}
                                for(const prop in dta){
                                    const val = dta[prop]
                                    if(val && typeof val === "object" && typeof val.getTime === "undefined" && typeof val.filter === "undefined" && Object.keys(val).length){
                                        for(const iprp in val)
                                            nobj[iprp] = val[iprp]
                                    } else {
                                        nobj[prop] = val
                                    }
                                }
                                ndata.push(nobj)
                            }
                        } catch(e){}
                    }
                } else {
                    ndata = data?.filter( function(d) { return true })
                }
                return ndata;
            },

            convertNeededCols: function(data) {
                data = deebo.methods.scoopOutObjsInObjs(data)
                data = deebo.methods.renameColSpecChars(data)
                let nData = data?.filter( function(d) { return true })
                const symReg = new RegExp(/[$€£₹¥¢%\,\"\']/, "g")
                const isDtReg = new RegExp(/\d+(\/|-)\d+(\/|-)\d+/)
                let i = 0;
                const len = data?.length
                let allCols
                // let throwAways = []
                if(data && data.some( function(d) { return d && typeof d === "object" })){
                    allCols = deebo.methods.getDataColumns(data)//gets all possible props in array
                    dataTableService.methods.dataFilSrtTracker = dataTableService.methods.buildDataFilSrtTracker(allCols)
                    for(i; i < len; i++){
                        try{
                            if(data[i] && typeof data[i] === "object"){
                                for(const prop in data[i]){
                                    if(allCols.indexOf(prop) < 0){
                                        delete data[i][prop]
                                        continue
                                    }
                                    const val = data[i][prop]
                                    if(val && typeof val === "string"){
                                        const tval = val.trim()
                                        const low = tval.toLocaleLowerCase()
                                        if(deebo.methods.testShortDate(tval) || deebo.methods.testISODate(tval) || deebo.methods.testLongDate(low))
                                            nData[i][prop] = deebo.methods.coerceDate(tval)
                                        if(deebo.methods.testISODate(tval.replace(/ /g, "")))
                                            nData[i][prop] = deebo.methods.coerceDate(tval.replace(/ /g, ""))
                                        if(low === "null" || low === "undefined")
                                            nData[i][prop] = null
                                        if(!deebo.methods.idCol(prop) && !isDtReg.test(tval) && !/[A-Za-z]/g.test(val) && (/^[0-9,]+[\.]{0,1}?[0-9,]+$/g.test(tval.replace(symReg, "")) || !isNaN(parseInt(tval.replace(symReg, "")))))//not viewed as num, but can be
                                            nData[i][prop] = /\./g.test(val) ? parseFloat(tval.replace(symReg, "")) : parseInt(tval.replace(symReg, ""))
                                    }
                                    if(val && typeof val === "object" && typeof val.getTime === "undefined")/**not dates */
                                        try{ nData[i][prop] = JSON.stringify(val).replace(/[\[\]{}\"]/g, "").replace(/:/g, ": ").replace(/,/g, ", ").replace(/  /g, " ")}catch(e){}
                                }
                                const keys = Object.keys(data[i])
                                const diff = allCols.filter( function(c) { return keys.indexOf(c) < 0 })
                                const dLen = diff.length
                                if(dLen){//obj doesn't have all props
                                    // throwAways.push(i)
                                    let n = 0
                                    for(n; n < dLen; n++)
                                        nData[i][diff[n]] = "";
                                }
                            }
                        }catch(e) {  }
                    }
                }
                //read data that's already not a string
                if(allCols && allCols.length){//array of objs
                    let a = 0
                    const alen = allCols.length
                    for(a; a < alen; a++){
                        const col = allCols[a]
                        const colData = nData?.map( function(d) { return d[col] })
                        if(colData && colData.every( function(d) { return !d }))
                            continue
                        if(!deebo.methods.idCol(col) && colData && colData.every( function(d) { return !d || typeof d === "number" })){
                            try{ dataTableService.methods.dataFilSrtTracker[col]["type"] = "number" } catch(e){}
                        }
                        if(colData && colData.every( function(d) { return !d || deebo.methods.isADateObject(d) })){
                            try{ dataTableService.methods.dataFilSrtTracker[col]["type"] = "date" } catch(e){}
                        }
                        if(colData && colData.every( function(d) { return !d || typeof d === "boolean" })){
                            nData = nData.map( function(d) {
                                d[col] = d[col]?.toString() || "false";
                                return d
                            })
                        }
                    }
                }
                // if(throwAways.length)
                //     nData = nData.filter( function(d, ind) { return throwAways.indexOf(ind) < 0 })
                return nData
            },

            createSelectRowCheck: function(indx) {
                const el = document.createElement("input")
                el.id = "checkDataTableRow" + indx
                el.name = "checkDataTableRow" + indx
                el.type = "checkbox"
                el.value = ("dataTableRow" + indx);
                el.className = "select-row-check"
                el.className += " hide"
                deebo.methods.unbindMouseRemoveEvts(el)
                el.onclick = deebo.methods.toggleSingleRowSelected
                el.onkeyup = deebo.methods.handleKeyCheckRowSelect
                try{ el.checked = dataTableService.methods.currSelRows.indexOf(parseInt(indx.toString())) > -1 }catch(e){  }
                document.getElementById("dataTableChecks").appendChild(el)
            },

            setRowSelChecksPlacement: function() {
                let i = 0
                const els = document.getElementsByClassName("select-row-check")
                const len = els.length
                const dtBody = document.getElementById("dataTableBody")
                const tbds = dtBody.getBoundingClientRect()
                const initT = deebo.methods.initCheckTop()
                const col1Frozen = document.getElementsByClassName("col-item-freeze").length
                for(i; i < len; i++){
                    const chk = els[i]
                    const row = document.getElementById(chk.value)
                    if(row){
                        const tTop = tbds.top
                        const rbds = row.getBoundingClientRect()
                        const hh = (rbds.height/2)
                        const top = Math.floor(initT + ((rbds.bottom - (hh+5)) - tTop))
                        chk.style.top = Math.floor(top) + "px"
                        if((rbds.top+(hh-5)) < tTop || ((rbds.bottom - (hh-5)) >= (tTop + tbds.height)) || (dtBody.scrollLeft > 35 && !col1Frozen)){
                            chk.classList.add("hide")
                            continue
                        }
                        chk.className = "select-row-check"
                    } else {
                        chk.classList.add("hide")
                    }
                }
                if(deebo.methods.rowNumbers)
                    deebo.methods.setRowNumbers()
            },

            
            setRowNumbers: function() {
                const rows = document.getElementsByClassName("data-table-row")
                const rbod = document.getElementById("rowNumBody")
                let r = 0
                let priors = {}
                const nlen = rbod.children.length
                const defNum = parseInt(dataTableService.methods.defltRHgt.replace(/[ ]?px/g, ""))
                for(r; r < nlen; r++){
                    const rn = rbod.children[r]
                    if(rn && rn.classList.contains("num-row")){
                        const hgt = Math.ceil(rn.getBoundingClientRect().height)
                        if(hgt !== defNum)
                            priors[rn.id] = hgt
                    }
                }
                const rlen = rows.length
                if(rbod && rlen){
                    rbod.innerHTML = ""
                    let n = (deebo.methods.lastElRowIndex + 1) - rlen
                    for(n; n <= deebo.methods.lastElRowIndex; n++){
                        const num = (n + 1)
                        const rn = document.createElement("div")
                        const rnin = document.createElement("div")
                        rn.className = "flex-center"
                        rn.classList.add("num-row")
                        const phgt = priors["rn" + num]
                        rn.style.height = phgt ? (phgt+"px") : dataTableService.methods.defltRHgt;
                        rn.id = "rn" + num
                        rnin.className = "small-text"
                        rnin.textContent = num.toLocaleString(undefined, { maximumFractionDigits: 0 })
                        rn.appendChild(rnin)
                        rbod.appendChild(rn)
                    }
                    const r1 = document.getElementById("dataTableRow" + rows[0]?.getAttribute("data-index"))
                    if(r1){
                        const useCalc = -(dataTableService.methods.tblTop - r1.getBoundingClientRect().top)
                        rbod.style.marginTop = Math.min(useCalc, 0) +  "px"
                    }
                }
            },

            initCheckTop: function() {
                const headHt = document.getElementById("dataTableHeaders").getBoundingClientRect().height
                return headHt + 17;//dt table marg top is 17
            },

            handleKeyCheckRowSelect: function(e) {
                if(e && deebo.methods.isEnterKey(e))
                    deebo.methods.toggleSingleRowSelected(e)
            },

            toggleNonInitCtrlBtns: function(show) {
                const bctrls = document.getElementsByClassName("btn-ctrl-sel-rows")
                const rs = document.getElementById("btnReset")
                const len = bctrls.length
                if(rs){
                    if(show)
                        rs.classList.remove("hide")
                    else
                        rs.classList.add("hide")
                }
                for(var i = (len-1); i >= 0; i--){
                    const bc = bctrls[i]
                    if(show)
                        bc.classList.remove("hide")
                    else
                        bc.classList.add("hide")
                }
            },

            handleFilSDataStr: function(trdiv) {
                const par = trdiv.parentElement
                let filsDiv = document.getElementById("filSDiv")
                if(!filsDiv){
                    filsDiv = document.createElement("div")
                    filsDiv.id = "filSDiv"
                    filsDiv.className = "inline"
                    filsDiv.className += " v-mid"
                    par.appendChild(filsDiv)
                }
                filsDiv.innerHTML = deebo.methods.getAllFilSrtInfo()
            },

            toggleSelectedRows: function(event, forceUnsel) {
                dataTableService.methods.displayOnlySelRows = !dataTableService.methods.displayOnlySelRows
                if(forceUnsel)
                    dataTableService.methods.displayOnlySelRows = false
                const icn = document.querySelector("#btnTogSelRows i")
                if(dataTableService.methods.displayOnlySelRows){
                    dataTableService.methods.currFilData = dataTableService.methods.mainData.
                    filter( function(d, ind) { return dataTableService.methods.currSelRows.indexOf(ind) > -1 })
                    if(icn){
                        icn.textContent = "check_box"
                        icn.classList.add("sel-rows-checked")
                    }
                } else {
                    dataTableService.methods.currFilData = dataTableService.methods.mainData.filter( function(d) { return true })
                    if(icn){
                        icn.classList.remove("sel-rows-checked")
                        icn.textContent = "check_box_outline_blank"
                    }
                }
                if(dataTableService.methods.arefilSrtTrkPropsDefault()){
                    deebo.methods.renderCurrData()
                    document.getElementById("btnReset").disabled = false
                    const dct = dataTableService.methods.currFilData.length.toLocaleString(undefined, { maximumFractionDigits: 0 })
                    const tRows = document.getElementById("totalRows")
                    if(tRows){
                        tRows.textContent = dct
                        deebo.methods.handleFilSDataStr(tRows)
                    }
                    deebo.methods.setExportCount(dct)
                } else {
                    const col = document.getElementsByClassName("col-header")[0]?.id.replace(/columnHeader/g, "")//just fil by 1st col
                    const fil = document.getElementById("filter" + col)
                    if(col && fil)
                        deebo.methods.filterOnKeyUp({ target: { id: ("filter" + col), value: (fil.value || "") } })
                }
            },

            toggleSingleRowSelected: function(event) {
                if(tblDragEvents.methods.didResizeOnEvent)
                    return false
                const el = document.getElementById(event.target.value);
                if(el){
                    const ind = el.getAttribute("data-index")
                    if(ind){
                        try{
                            const useInd = parseInt(ind)
                            if(dataTableService.methods.currSelRows.indexOf(useInd) > -1){//it's already selected
                                el.classList.remove("data-row-selected")
                                event.target.checked = false
                                dataTableService.methods.currSelRows = dataTableService.methods.currSelRows.filter( function(r) { return r !== useInd })
                                if(dataTableService.methods.displayOnlySelRows){
                                    document.getElementById("btnTogSelRows").click()
                                    document.getElementById("btnTogSelRows").click()
                                    if(!dataTableService.methods.currSelRows.length)
                                        document.getElementById("btnTogSelRows").click()
                                }
                            } else {
                                const numUseInd = parseInt(useInd)
                                el.classList.add("data-row-selected")
                                event.target.checked = true
                                if(dataTableService.methods.currSelRows.indexOf(numUseInd) < 0)
                                    dataTableService.methods.currSelRows.push(numUseInd)
                                deebo.methods.forceFreeze()
                            }
                        }catch(e){}
                    }
                }
                deebo.methods.toggleSelRowButtons()
            },

            forceFreeze: function() {
                const btnFz = document.getElementsByClassName("btn-freeze-col")[0]
                if(btnFz && btnFz.getBoundingClientRect().left < 0){
                    const col = deebo.methods.replaceUniSep(btnFz.id?.replace(/btnFreeze/g, ""))
                    const trk = dataTableService.methods.dataFilSrtTracker[col]
                    if(trk){
                        let hasIt
                        if(typeof Object.hasOwn !== "undefined")
                            hasIt = Object.hasOwn(trk, "freeze");
                        else
                            hasIt = trk.hasOwnProperty("freeze");
                        if(hasIt){
                            trk.freeze = false
                            btnFz.click()
                        }
                    }
                }
            },


            toggleSelRowButtons: function() {
                const selLen = dataTableService.methods.currSelRows.length
                document.getElementById("btnXSelRows").disabled = !selLen
                document.getElementById("btnTogSelRows").disabled = !selLen
                deebo.methods.setBtnTogRows(selLen)
            },  

            setBtnTogRows: function(amt) {
                const btn = document.getElementById("btnTogSelRows")
                if(btn && btn.lastElementChild){
                    if(amt){
                        btn.lastElementChild.textContent = amt.toLocaleString(undefined, {maximumFractionDigits:0}) + " Selected Row" + (amt == 1 ? "" : "s")
                    } else {
                        btn.lastElementChild.textContent = "Selected Rows"
                    }
                }
            },

             clearSelectedRows: function(event) {
                dataTableService.methods.currSelRows = []
                const fullClear = dataTableService.methods.displayOnlySelRows ? true : false;
                dataTableService.methods.displayOnlySelRows = false
                const els = document.getElementsByClassName("data-row-selected")
                const chks = document.getElementsByClassName("select-row-check")
                const len = els.length
                const clen = chks.length
                for(var i = (len-1); i >= 0; i--)
                    els[i].classList.remove("data-row-selected")
                for(var o = (clen-1); o >= 0; o--)
                    chks[o].checked = false;
                deebo.methods.toggleSelRowButtons()
                if(fullClear)
                    deebo.methods.toggleSelectedRows(null, true)
            },

            updateUiColCellTheme: function(cssProp, val, forceCol) {
                let i = 0
                let tempVal;
                if(val && typeof val === "object" && val.value && val.name)
                    tempVal = val.value;
                const els = document.getElementsByClassName("data-cell-" + (deebo.methods.currColumnEdit || forceCol))
                const len = els.length
                const prop = deebo.methods.replaceUniSep((deebo.methods.currColumnEdit || forceCol))
                if(prop && dataTableService.methods.dataFilSrtTracker[prop]){
                    const backToCss = { 
                        width: "width", color: "color", background: "background", borderBottom: "border-bottom",
                        fontWeight: "font-weight", textAlign: "text-align", fontSize: "font-size", fontFamily: "font-family",
                    }
                    for(i; i < len; i++){
                        els[i]["style"][cssProp] = (tempVal || val)
                        if(!val)
                            try{els[i]["style"].removeProperty(backToCss[cssProp])}catch(e){}
                        if(cssProp === "fontFamily"){
                            if(tempVal){
                                els[i].firstElementChild["style"][cssProp] = (tempVal || val)
                                if(!val)
                                    try{els[i].firstElementChild["style"].removeProperty(backToCss[cssProp])}catch(e){}
                            } else {
                                try{els[i].firstElementChild["style"].removeProperty(backToCss[cssProp])}catch(e){}
                            }
                        }
                    }
                    if(cssProp === "width"){
                        setTimeout( function() { deebo.methods.handleSingleColResize(val || deebo.methods.useColWid) })
                        dataTableService.methods.dataFilSrtTracker[prop].colWidth = val || deebo.methods.useColWid
                    }                    
                }
            },

            handleSingleColResize: function(val) {
                if(val && deebo.methods.currColumnEdit){
                    const head = document.getElementById("columnHeader" + deebo.methods.currColumnEdit)
                    const cols = deebo.methods.getAllColsAtRuntime(true);
                    const colLen = cols.length - deebo.methods.getMiniColCount()
                    if(head)
                        head.style.width = val;
                    const allColW = deebo.methods.getAllColWidth(colLen)
                    deebo.methods.setDataRowWidthsOnMinimize(allColW)
                    deebo.methods.setRowSelChecksPlacement()
                    deebo.methods.testHideMinBtn()
                    deebo.methods.clearValidatedEdit()
                }
            },

            testHideMinBtn: function() {
                let i = 0
                const els = document.getElementsByClassName("btn-min-col")
                const len = els.length
                for(i; i < len; i++){
                    const el = els[i]
                    const col = el.id.replace(/btnMin/g, "")
                    const ellf = el.getBoundingClientRect().left
                    const srt = document.getElementById("btnSort" + col)
                    if(srt){
                        const srtrt = srt.getBoundingClientRect().right + 5;
                        if(ellf < srtrt)
                            el.classList.add("btn-min-col-hide")
                        else
                            el.className = "btn-min-col"
                    }
                }
            },

            clearAllFocused: function() {//for editing
                const els = document.getElementsByClassName("focused-el")
                const len = els.length
                for(var i = (len-1); i >= 0; i--)
                    els[i].classList.remove("focused-el")
            },

            blockEventsInCells: function() {
                const cImgs = document.querySelectorAll(".data-cell img")
                const cAnc = document.querySelectorAll(".data-cell a")
                const len = cImgs.length
                const alen = cAnc.length
                for(var i = (len-1); i >= 0; i--){
                    const img = cImgs[i]
                    if(img.getAttribute("data-blocked"))
                        continue
                    deebo.methods.unbindMouseRemoveEvts(img)
                    img.setAttribute("data-blocked", "true")
                }
                for(var o = (alen-1); o >= 0; o--){
                    const anc = cAnc[o]
                    if(anc.getAttribute("data-blocked"))
                        continue
                    deebo.methods.unbindMouseRemoveEvts(anc)
                    // if(deebo.methods.editable){
                    //     anc.addEventListener("mouseenter", deebo.methods.tempRemContentEdit)
                    //     anc.addEventListener("mouseleave", deebo.methods.reinitContentEdit)
                    // }
                    anc.setAttribute("data-blocked", "true")
                }
            },

            // tempRemContentEdit: function(e) {
            //     if(e && e.target && e.target.parentElement && e.target.parentElement.getAttribute("contenteditable"))
            //         e.target.parentElement.removeAttribute("contenteditable")
            // },

            // reinitContentEdit: function(e) {
            //     if(e && e.target && e.target.parentElement && /data-cell/g.test(e.target.parentElement.className))
            //         e.target.parentElement.setAttribute("contenteditable", "true")
            // },

            unbindMouseRemoveEvts: function(el) {
                if(window.innerWidth >= deebo.methods.mouseEventBreak){
                    el.addEventListener("mousemove", function(e) { e && e.stopPropagation()})
                    el.addEventListener("mousedown", function(e) { e && e.stopPropagation()})
                    el.addEventListener("mouseup", function(e) { e && e.stopPropagation()})
                }
            },

            setLastRowIndex: function() {
                const realMax = dataTableService.methods.currFilData.length - 1
                const defNum = parseInt(dataTableService.methods.defltRHgt.replace(/[ ]?px/g, ""))
                const wannabeMax = (document.getElementsByClassName("data-table-row").length - 1) + Math.floor(Math.max(0, deebo.methods.aboveHgt)/defNum)
                deebo.methods.lastElRowIndex = Math.min(wannabeMax, realMax)
                return deebo.methods.lastElRowIndex;
            },

            dblClickCol: function(elCol) {
                if(elCol){
                    const prop = deebo.methods.replaceUniSep(elCol)
                    if(dataTableService.methods.dataFilSrtTracker[prop]){
                        let i = 0
                        let wids = []
                        let useWid = 50
                        const els = document.getElementsByClassName("data-cell-" + elCol)
                        const nw = els[0]?.getBoundingClientRect().width || 0
                        const len = els.length
                        for(i; i < len; i++)
                            wids.push(els[i].scrollWidth)
                        useWid =wids.sort()[(len-1)]
                        if(useWid && useWid > nw){
                            const cswid = Math.ceil(useWid+1) + "px"
                            deebo.methods.updateUiColCellTheme("width", cswid, elCol) 
                            document.getElementById("columnHeader" + elCol).style.width = cswid
                        }
                    }
                }
            },

            setLoading: function(err) {
                const tbody = document.getElementById("dataTableBody")
                if(tbody){
                    const dtr = document.getElementsByClassName("data-table-row")[0]
                    if(err && dtr)
                        tbody.removeChild(dtr)
                    const lrow = document.createElement("div")
                    deebo.methods.styleEmptyFilDataRow(lrow, tbody, null, (err || "Loading..."))
                    tbody.appendChild(lrow)
                }
            },

            buildInitUiDataTable: function(data, color1, color2, blockEditing, hideRowNumbers) {//will be array of objects
                try{
                    const cols = Object.keys(data[0])         
                    const head = document.getElementById("dataTableHeaders")
                    const tbody = document.getElementById("dataTableBody")
                    try{ tbody.removeChild(document.getElementsByClassName("data-table-row")[0]) }catch(e){}
                    if(blockEditing)
                        deebo.methods.editable = false;
                    let i = 0; let n = 0;
                    const len = data.length;
                    const colLen = cols.length
                    const wid = window.innerWidth;
                    const rns = document.getElementsByClassName("row-numbers")[0]
                    if(rns){
                        if(hideRowNumbers){
                            deebo.methods.rowNumbers = false
                            rns.parentElement.removeChild(rns)
                        } else {
                            document.getElementById("dataTableChecks").classList.add("dt-checks")
                            document.getElementById("dataTable").classList.add("inline-table")
                            document.getElementById("rowNumHeader").nextElementSibling.style.height = deebo.methods.dTblHeight + "px"
                        }
                    }
                    tbody.style.height = deebo.methods.dTblHeight + "px";
                    const maxCols = deebo.methods.setMaxCols(wid)
                    const defNum = parseInt(dataTableService.methods.defltRHgt.replace(/[ ]?px/g, ""))
                    const init = Math.max(deebo.methods.dTblHeight/defNum);
                    deebo.methods.useColWid = Math.ceil((tbody.getBoundingClientRect().width-16)/Math.min(colLen, maxCols)) + "px"
                    let canFreeze
                    for(i; i < colLen; i++){
                        const col = cols[i]
                        canFreeze = i === 0 && !document.getElementsByClassName("col-header").length
                        deebo.methods.insertColumnHeader(col, head, canFreeze)
                        if(i < maxCols)
                            dataTableService.methods.visibleCols.push(col)
                        deebo.methods.columnNames.push(col)
                    }
                    deebo.methods.handleColAnyDDFilters(data, cols)
                    const addCell = function(text, prop, row, indx, vis) {
                        const cell = document.createElement("div")
                        const elProp = prop?.replace(/ /g, deebo.methods.uniSep) 
                        cell.className = "data-cell"
                        cell.className += (" data-cell-" + elProp)
                        cell.tabIndex = 0
                        if(vis){
                            cell.style.width = deebo.methods.useColWid
                            cell.style.height = dataTableService.methods.defltRHgt
                            const head = document.getElementById("columnHeader" + elProp)
                            const filInp = document.getElementById("filter" + elProp)
                            const canEdit = deebo.methods.editable && !deebo.methods.shouldValidateEdit(prop, filInp);
                            const notNum = (filInp && (filInp.getAttribute("type") != "number" || /(year|yr|fy)/g.test(prop.toLocaleLowerCase()))) ? true : false
                            if(head && head.classList.contains("col-item-freeze"))
                                cell.classList.add("col-item-freeze")
                            if(filInp && filInp.getAttribute("type") === "number")
                                cell.classList.add("data-cell-riiight")
                            let useTxt; let sym;
                            if(dataTableService.methods.dataFilSrtTracker && dataTableService.methods.dataFilSrtTracker[prop]){
                                sym = dataTableService.methods.dataFilSrtTracker[prop]["colCellSymbol"]
                                useTxt = deebo.methods.figureCellText(text, notNum, sym)
                            } else {
                                useTxt = deebo.methods.figureCellText(text, notNum)
                            }
                            if(useTxt.prop === "textContent"){
                                cell.textContent = useTxt.value
                                if(canEdit)
                                    cell.setAttribute("contenteditable", "true")
                            } else {
                                cell.innerHTML = useTxt.value
                            }
                            if(sym){
                                let symbolCls = ["$","€","£","¥","₣","₹"].indexOf(sym) > -1 ? "has-symbol-b" : "has-symbol";
                                cell.classList.add(symbolCls)
                                cell.setAttribute("data-symbol", sym)
                            }
                            // if(useTxt.ancs && useTxt.ancs.length)
                            //     deebo.methods.giveCellAncOptions(indx, elProp, useTxt.ancs)
                            if(window.innerWidth >= deebo.methods.mouseEventBreak){
                                cell.addEventListener("mousemove", tblDragEvents.methods.checkItemBorderCursor)
                                cell.addEventListener("mousemove", tblDragEvents.methods.handleCellSizeAdjust)
                                cell.addEventListener("mousedown", tblDragEvents.methods.handleCellSizeAdjust)
                            }
                            if(deebo.methods.editable && useTxt.prop === "textContent"){
                                cell.addEventListener("focus", deebo.methods.setCellToEdit);
                                if(canEdit)
                                    cell.addEventListener("blur", deebo.methods.emitEdit);
                                cell.addEventListener("mousedown", deebo.methods.checkCellEditOnClick)
                            }
                            cell.className += " data-visible";
                        }
                        row.appendChild(cell)
                        if(row && prop && row.children.length === 1)
                            deebo.methods.createSelectRowCheck(row.getAttribute("data-index"))
                    }
                    const limit = Math.min(init, len)
                    const horizLim = Math.min((maxCols+1), colLen)
                    const blw = document.getElementById("belowArea")
                    deebo.methods.useRowWid = deebo.methods.getAllColWidth(colLen) + "px"
                    for(n; n < limit; n++){
                        const row = document.createElement("div")
                        row.id = "dataTableRow" + n
                        row.className = "data-table-row"
                        row.setAttribute("data-index", n)
                        blw.insertAdjacentElement("beforebegin", row)
                        row.style.width = deebo.methods.useRowWid
                        row.style.height = dataTableService.methods.defltRHgt
                        let k = 0
                        for(k; k < colLen; k++)
                            addCell(data[n][cols[k]], cols[k], row, n, (k <= horizLim))
                        dataTableService.methods.currMapping[n] = n
                    }
                    deebo.methods.setLastRowIndex()
                    deebo.methods.blockEventsInCells()
                    deebo.methods.toggleNonInitCtrlBtns(true)
                    document.getElementById("tableFooter").className = "data-table-footer"
                    deebo.methods.setUpPaginatorOnTblLoad()
                    const dct = len.toLocaleString(undefined, { maximumFractionDigits: 0 })
                    const tRows = document.getElementById("totalRows")
                    if(tRows){
                        tRows.textContent = dct
                        deebo.methods.handleFilSDataStr(tRows)
                    }
                    deebo.methods.setExportCount(dct)
                    tbody.addEventListener("scroll", deebo.methods.handleScroll);
                    tbody.addEventListener("scrollend", deebo.methods.handleScrollEnd);
                    window.addEventListener("resize", dataTableService.methods.setTableBounds)
                    window.addEventListener("mouseup", deebo.methods.handleScrlBarDrag)
                    window.addEventListener("click", deebo.methods.testEditDDs)
                    deebo.methods.handleTheme(color1, color2)
                    if(len)
                        document.getElementById("btnCharts").disabled = false
                    setTimeout( function() { 
                        deebo.methods.testHideMinBtn()
                        deebo.methods.setColHeaderHgt()
                        deebo.methods.setHoldingCheckCls()
                        deebo.methods.setRowSelChecksPlacement()
                        dataTableService.methods.setTableBounds()
                    })
                    setTimeout( function() {
                        if(len > init){
                            let total = 0
                            let z = deebo.methods.lastElRowIndex + 1
                            for(z; z < len; z++){
                                total += 1
                                dataTableService.methods.currMapping[z] = z
                            }
                            deebo.methods.belowHgt = total*defNum
                            blw.style.height = deebo.methods.belowHgt + "px"
                        }
                        dataTableService.methods.setTableBounds()
                        deebo.methods.setIdealColWidth(cols, horizLim)
                        deebo.methods.setColsOnVisScreen()
                    }, 250)
                    deebo.methods.getPrimaryKey(cols)
                } catch(e) { 
                    deebo.methods.setLoading(e.stack)
                }                
            },

            getPrimaryKey: function(cols) {
                let i = 0
                const len = cols.length
                for(i; i < len; i++){
                    const col = cols[i]
                    if(deebo.methods.idCol(col)){
                        const colData = dataTableService.methods.mainData.map( function(d) { return d[col] })
                        if(colData && !colData.some( function(c) { return !c })){//no null vals
                            const map = new Set(colData)
                            if(map.size === dataTableService.methods.mainDataLen){//all unique vals
                                dataTableService.methods.primaryKey = col
                                return dataTableService.methods.primaryKey
                            }
                        }
                    }
                }
                return ""
            },

            setIdealColWidth: function(cols, horizLim) {
                let o = 0
                const useLen = horizLim || cols?.length || 0
                for(o; o < useLen; o++){
                    if(dataTableService.methods.dataFilSrtTracker[cols[o]] && !dataTableService.methods.dataFilSrtTracker[cols[o]].minimize)
                        deebo.methods.dblClickCol(cols[o]?.replace(/ /g, deebo.methods.uniSep))
                }
            },

            handleColAnyDDFilters: function(data, cols) {
                let i = 0;
                const len = cols.length
                const dLen = data.length
                for(i; i < len; i++){
                    const col = cols[i]
                    const colData = data.map( function(d) { return (d && typeof d === "object") ? d[col] : d })
                    const yearCol = /(year|yr|fy)/g.test(col?.toLocaleLowerCase())
                    const allNumData = colData.every( function(d) { return !d || (d && typeof d === "number") })
                    const boolData = colData.every( function(d) { return !d || (d && typeof d === "boolean") })
                    if(colData.every( function(d) { return !d }))
                        continue;
                    let bitData;
                    if(allNumData)
                        bitData = colData.every( function(d) { return !d || d === 1 || d === 0 })
                    if(allNumData && !yearCol && !bitData)//num data
                        continue
                    const dSet =new Set(colData)
                    if(dSet.size >= colData.filter( function(d) { return !!d }).length)
                        continue//means values are all unique so likely not dropdown material
                    let arrFrmSet = []
                    dSet.forEach( function(v) { arrFrmSet.push(v) })                         
                    const doSels = dLen < 100 ? 2 : ((dLen >= 100 && dLen < 500) ? 10 : 15)
                    const cantDoDD = arrFrmSet.some( function(a) { return a && a.length > 40 })
                    if(!cantDoDD && ((boolData || bitData) || (arrFrmSet.filter( function(a) { return !!a }).length > 0 && colData.every( function(d) { return !d || typeof d === "string" })))){
                        if(arrFrmSet.length > 1 && arrFrmSet.length <= doSels)
                            deebo.methods.swapColFilterToSelect(col, arrFrmSet.filter( function(v) { return !!v && deebo.methods.badStrings.indexOf(v) < 0 }))
                    }
                }
            },

            swapColFilterToSelect: function(col, vals) {
                if(!document.getElementById("selFilContainer"))
                    return;
                const elId= col.replace(/ /g, deebo.methods.uniSep)
                const useId = "filter" + elId
                const filInp = document.getElementById(useId)
                if(filInp){
                    filInp.classList.add("select-filter");
                    filInp.setAttribute("readonly", "true")
                    filInp.setAttribute("autocomplete", "off")
                    filInp.removeEventListener("focus", deebo.methods.killSelFilOpts)
                    filInp.addEventListener("focus", deebo.methods.buildSelFilOptions)
                    const comp = document.getElementById("selectComp" + elId)
                    let o = 0; let i = 0;
                    vals = vals?.sort()
                    const oLen = vals?.length
                    dataTableService.methods.dataFilSrtTracker[col]["selDDVals"] = []
                    dataTableService.methods.dataFilSrtTracker[col]["selDDVals"].push({ value: "(Select All)", checked: true })
                    for(o; o < oLen; o++)
                        dataTableService.methods.dataFilSrtTracker[col]["selDDVals"].push({ value: vals[o], checked: true })
                    if(comp){
                        comp.value = "Equals"
                        dataTableService.methods.dataFilSrtTracker[col].comparator = "Equals"
                    }
                    const cLen = comp.options?.length
                    const canComp = ["Equals", "Not Equal", "Empty", "Not Empty",]
                    for(i; i < cLen; i++){
                        const opt = comp.options[i]
                        if(opt && opt.value && canComp.indexOf(opt.value) < 0)
                            opt.disabled = true
                    }
                }
            },

            buildSelFilOptions: function(e) {
                if(e && e.target && /^select/g.test(e.target.className)){
                    let i = 0
                    const elCol = e.target.id?.replace(/filter/g, "")
                    const col= deebo.methods.replaceUniSep(elCol)
                    if(col && dataTableService.methods.dataFilSrtTracker[col] && dataTableService.methods.dataFilSrtTracker[col]["selDDVals"]){
                        try{
                            const esfd = document.getElementById("currSelFilterDD")
                            const here = document.getElementsByClassName("selfil-opt-" + elCol).length
                            if(here){
                                e.target.blur()
                                esfd.parentElement.innerHTML = ""
                                return window.removeEventListener("click", deebo.methods.killSelFilOpts)
                            }
                            if(esfd){
                                esfd.parentElement.innerHTML = ""
                                window.removeEventListener("click", deebo.methods.killSelFilOpts)
                            }
                            const rel = document.getElementById("selFilContainer")
                            const sel = document.createElement("div")
                            sel.id = "currSelFilterDD"
                            sel.className = "selfil-opt-contain"
                            rel.appendChild(sel)
                            const makeChk = function(sval, i) {
                                const div = document.createElement("div")
                                const lbl = document.createElement("label")
                                const chk = document.createElement("input")
                                div.className = "selfil-div"
                                lbl.className = "selfil-lbl-" + elCol
                                chk.id = "selfilOpt" + elCol + i
                                chk.name = "selfilOpt" + elCol + i
                                chk.value = sval.value
                                chk.type = "checkbox"
                                chk.className = "selfil-opt-" + elCol
                                if(sval.checked)
                                    chk.setAttribute("checked", true)
                                chk.oninput = deebo.methods.handleMultiSelFilter
                                chk.onclick = deebo.methods.handleMultiSelFilter
                                lbl.textContent = sval.value || "(Blank)";
                                lbl.insertAdjacentElement("afterbegin", chk)
                                div.appendChild(lbl)
                                sel.appendChild(div)
                            }
                            const len = dataTableService.methods.dataFilSrtTracker[col]["selDDVals"].length
                            for(i; i < len; i++)
                                makeChk(dataTableService.methods.dataFilSrtTracker[col]["selDDVals"][i], i)
                            const rbds = rel.getBoundingClientRect()
                            const ibds = e.target.getBoundingClientRect()
                            sel.style.top = Math.ceil((ibds.bottom - rbds.top)+5) + "px";
                            sel.style.left = Math.ceil(ibds.left - rbds.left) + "px";
                            window.addEventListener("click", deebo.methods.killSelFilOpts)
                            e.target.blur()
                        }catch(e){}
                    }
                }
            },

            isMultiFiltering: false,

            handleMultiSelFilter: function(e) {
                const elCol = e.target.className.replace(/selfil-(opt|lbl)-/g, "")
                const col= deebo.methods.replaceUniSep(elCol)
                let checkAll;
                const sAll = "(Select All)";
                if(col && dataTableService.methods.dataFilSrtTracker[col] && !deebo.methods.isMultiFiltering && 
                    dataTableService.methods.dataFilSrtTracker[col]["selDDVals"]){
                    dataTableService.methods.dataFilSrtTracker[col]["selDDVals"] = dataTableService.methods.dataFilSrtTracker[col]["selDDVals"].map( function(v) {
                        if(e.target.value === sAll){
                            v.checked = e.target.checked
                            checkAll = e.target.checked ? "true" : "false";
                        } else {
                            const tarChkd = e.target.checked;
                            if((v.value === e.target.value) || (!v.value && !e.target.value))
                                v.checked = tarChkd
                            if(!tarChkd && v.value === sAll){
                                v.checked = false
                                let i = 0
                                const els = document.getElementsByClassName("selfil-opt-" + elCol)
                                const len = els.length
                                for(i; i < len; i++){
                                    if(els[i].value === sAll)
                                        els[i].checked = false;
                                }
                            }
                        }
                        return v
                    })
                    if(checkAll && typeof checkAll === "string"){
                        let i = 0
                        const els = document.getElementsByClassName("selfil-opt-" + elCol)
                        const len = els.length
                        for(i; i < len; i++)
                            els[i].checked = checkAll === "true" ? true : false;

                    }
                    const fId = "filter" + elCol;
                    deebo.methods.isMultiFiltering = true;
                    deebo.methods.filterOnKeyUp({ target: { id: fId, value: "" } })
                    setTimeout( function() { deebo.methods.isMultiFiltering = false })
                }
            },

            killSelFilOpts: function(e) {
                if(e && e.target && (!e.target.className || (e.target.className && !/selfil-/g.test(e.target.className)))){
                    const sfd = document.getElementById("currSelFilterDD")
                    if(sfd){
                        sfd.parentElement.innerHTML = ""
                        window.removeEventListener("click", deebo.methods.killSelFilOpts)
                    }
                }
            },

            testEditDDs: function() {
                if(document.getElementsByClassName("edit-input")[0] && (!document.activeElement || (document.activeElement && !document.activeElement.className)))
                    deebo.methods.clearValidatedEdit()
            },

            setCellToEdit: function(e) {
                if(tblDragEvents.methods.didResizeOnEvent)
                    return//was really a drag event, not click
                const mdIndx = e.target?.getAttribute("data-index") || e.target?.parentElement?.getAttribute("data-index")//data-table-row
                deebo.methods.currEditIndex = mdIndx
                const cell = /data-cell/g.test(e.target.className) ? e.target : e.target.firstElementChild;
                const ddReClick = cell.classList.contains("focused-el")
                deebo.methods.clearAllFocused()
                deebo.methods.clearDCellFcsd()
                const dragger = document.getElementById("fCellDragger")
                if(dragger)
                    dragger.className = "focused-cell-dragger";
                if(cell){//needs validation
                    const elProp = deebo.methods.getColFrmClsList(cell, "data-cell-")
                    const col = deebo.methods.replaceUniSep(elProp)
                    const filInp = document.getElementById("filter" + elProp)
                    const type = filInp?.getAttribute("type")
                    deebo.methods.currEditCol = col
                    if(deebo.methods.cellEditNeedsVal(col, cell, filInp, type)){
                        deebo.methods.handleValidatedCellEditFocus(cell, type, cell.textContent)
                        if(dataTableService.methods.dataFilSrtTracker[col] && dataTableService.methods.dataFilSrtTracker[col].selDDVals){//only for sel dds
                            if(ddReClick){
                                cell.blur()
                                return deebo.methods.clearAllFocused()
                            }
                            setTimeout( function() { cell.focus() }, 25)
                            setTimeout( function() { cell.classList.add("focused-el") }, 150)
                        }
                        return;
                    }
                    const valEd = document.getElementById("validatedEdit")
                    if(valEd)
                        valEd.innerHTML = ""
                    setTimeout( function() {
                        const fCellDragger = document.getElementsByClassName("focused-cell-dragger")[0];
                        const par = fCellDragger?.parentElement
                        if(fCellDragger && par){
                            const cbds = cell.getBoundingClientRect()
                            const rbds = par.getBoundingClientRect()
                            fCellDragger.style.left = (Math.ceil(cbds.left-rbds.left) + cbds.width - 4) + "px";
                            fCellDragger.style.top = (Math.ceil(cbds.bottom-rbds.top) - 4) + "px";
                        }
                    })
                }
            },

            cellEditNeedsVal: function(col, cell, filInp, type) {
                if(col && !/<(img|a)/g.test(cell.innerHTML) && (filInp && ["number", "date"].indexOf(type) > -1 || 
                    (dataTableService.methods.dataFilSrtTracker[col] &&dataTableService.methods.dataFilSrtTracker[col].selDDVals && dataTableService.methods.dataFilSrtTracker[col].selDDVals.length))){
                        return true
                }
                return false;
            },

            handleValidatedCellEditFocus: function(cell, type, value) {
                const rel = document.getElementById("validatedEdit")
                rel.innerHTML = ""
                const el = deebo.methods.createValEditInput(type, value);
                if(el && cell){
                    rel.appendChild(el)
                    const rbds = rel.getBoundingClientRect()
                    const cbds = cell.getBoundingClientRect();
                    el.style.top = (type === "text" ? (Math.ceil(cbds.bottom-rbds.top) + 1) : (Math.ceil(cbds.top-rbds.top) + 1)) + "px";
                    el.style.left = (Math.ceil(cbds.left-rbds.left) + 1) + "px";
                    el.style.width = (cbds.width-2) + "px";
                    el.style.height = (cbds.height-2) + "px";
                    if(el.nodeName === "INPUT")
                        setTimeout( function() { el.focus() })
                    rel.className = "relly"
                    const fd = document.getElementById("fCellDragger")
                    if(fd){
                        fd.style.left = (Math.ceil(cbds.left-rbds.left) + cbds.width - 4) + "px";
                        fd.style.top = (Math.ceil(cbds.bottom-rbds.top) - 4) + "px"
                    }
                }
            },

            clearFCellDragger: function() {
                const fd = document.getElementById("fCellDragger")
                if(fd){
                    fd.className = "hide"
                    fd.style.removeProperty("top")
                    fd.style.removeProperty("left")
                }
            },

            clearDCellFcsd: function() {
                const els = document.getElementsByClassName("dragger-cell-focused")
                const len = els.length
                for(let i = (len-1); i >= 0; i--){
                    const el = els[i]
                    if(el)
                        el.classList.remove("dragger-cell-focused")
                }
            },

            clearValidatedEdit: function(e, clearDrag) {
                if(deebo.methods.listenToCellDraggerMouseMove)
                    return;
                if((e && e.type === "blur") || (e && e.type === "focus" && e.relatedTarget?.id === "fCellDragger")){
                    setTimeout(deebo.methods.handleCellDraggerInit)
                } else {
                    deebo.methods.execValClear(clearDrag)
                }
            },

            execValClear: function(clearDrag) {
                deebo.methods.blurContEd()
                deebo.methods.currEditIndex = -1
                deebo.methods.currEditCol = ""
                deebo.methods.clearFCellDragger()
                const valEd = document.getElementById("validatedEdit")
                if(valEd){
                    valEd.innerHTML = ""
                    valEd.classList.add("invisible")
                }
                if(clearDrag)
                    deebo.methods.clearCellDEdits()
                setTimeout(deebo.methods.clearAllFocused)
                try{
                    window.removeEventListener("mouseup", deebo.methods.handleDraggerMU)
                    window.removeEventListener("mousemove", deebo.methods.handleCellDraggerEdit)
                    window.removeEventListener("selectstart", deebo.methods.stopWinSel)
                }catch(e) {}
            },

            handleDraggerMU: function() {
                deebo.methods.listenToCellDraggerMouseMove = false
                deebo.methods.clearDragEditFlag()
                try{
                    window.removeEventListener("mouseup", deebo.methods.handleDraggerMU)
                    window.removeEventListener("mousemove", deebo.methods.handleCellDraggerEdit)
                    window.removeEventListener("selectstart", deebo.methods.stopWinSel)
                    document.getElementById("fCellDragger").blur()
                }catch(e){}
            },

            clearCellDEdits: function() {
                deebo.methods.clearFCellDragger()
                deebo.methods.clearDCellFcsd()
                deebo.methods.clearDragEditFlag()
            },

            clearDragEditFlag: function() {
                let i = 0
                const rows = document.getElementsByClassName("data-table-row")
                const len = rows.length
                for(i; i < len; i++){
                    const row = rows[i]
                    if(row)
                        row.removeAttribute("data-dragged")
                }
            },

            handleCellDraggerInit: function() {
                const actEl = document.activeElement
                if(actEl && actEl.id === "fCellDragger"){
                    deebo.methods.focusCellDragger()
                } else {
                    if(!actEl || (actEl && !/data-cell/g.test(actEl?.className)))
                        deebo.methods.execValClear() 
                }
            },

            focusCellDragger: function() {
                const valEd = document.getElementById("validatedEdit")
                if(valEd){
                    valEd.innerHTML = "";
                    valEd.classList.add("invisible")
                }
                const cell= document.querySelector("#dataTableRow" + deebo.methods.currEditIndex + 
                " .data-cell-" + deebo.methods.currEditCol?.replace(/ /g, deebo.methods.uniSep))
                if(cell)
                    cell.classList.add("dragger-cell-focused")
                window.addEventListener("selectstart", deebo.methods.stopWinSel)
                window.addEventListener("mousemove", deebo.methods.handleCellDraggerEdit)
                setTimeout( function() { window.addEventListener("mouseup", deebo.methods.handleDraggerMU) })
                deebo.methods.listenToCellDraggerMouseMove = true;
            },

            settleCellDragger: function() {
                const els = document.getElementsByClassName("dragger-cell-focused")
                const len = els.length
                const cell = deebo.methods.scrollDir === "down" ? els[(len-1)] : els[0];
                if(cell){
                    const fCellDragger = document.getElementsByClassName("focused-cell-dragger")[0]
                    const par = fCellDragger?.parentElement
                    if(fCellDragger && par){
                        const cbds = cell.getBoundingClientRect()
                        const rbds = par.getBoundingClientRect()
                        fCellDragger.style.left = (Math.ceil(cbds.left-rbds.left) + cbds.width - 4) + "px";
                        fCellDragger.style.top = (Math.ceil(cbds.bottom-rbds.top) - 4) + "px";
                    }
                }
            },

            handleCellDraggerEdit: function(e) {
                if(e && e.target){
                    let dragId = -1;
                    const targ = e.target
                    try{
                        if(/dataTableRow/g.test(targ.id)){
                            dragId = parseInt(targ.id.replace("dataTableRow", ""))
                        } else {
                            if(/data-cell/g.test(targ.className))
                                dragId = parseInt(targ.parentElement.getAttribute("data-index"))
                        }
                        let cell;
                        const row = document.getElementById("dataTableRow" + dragId)
                        const els = document.getElementsByClassName("dragger-cell-focused")
                        if(dragId > -1 && (row && !row.getAttribute("data-dragged"))){
                            row.setAttribute("data-dragged", "true")
                            const item = dataTableService.methods.mainData[deebo.methods.currEditIndex]
                            const val = item[deebo.methods.currEditCol]
                            const currEInd = deebo.methods.findObjIndxInData(item, "currFilData")
                            const currDrgInd = deebo.methods.findObjIndxInData(dataTableService.methods.mainData[dragId], "currFilData")
                            cell = document.querySelector("#dataTableRow" + dragId + " .data-cell-" + deebo.methods.currEditCol.replace(/ /g, deebo.methods.uniSep))
                            deebo.methods.scrollDir = currDrgInd > currEInd ? "down" : "up";
                            deebo.methods.currEditIndex = dragId
                            deebo.methods.execCellEdit({ target: cell }, val)
                        }
                        if(els.length > 1){
                            const dir = deebo.methods.scrollDir === "down" ? 1 : -1;
                            const toScl = dir*(Math.ceil(e.offsetY)/2)
                            document.getElementById("dataTableBody").scrollBy(0, toScl)
                        }
                        const fCellDragger = document.getElementsByClassName("focused-cell-dragger")[0]
                        const par = fCellDragger?.parentElement
                        if(cell && fCellDragger && par){
                            const cbds = cell.getBoundingClientRect()
                            const rbds = par.getBoundingClientRect()
                            fCellDragger.style.left = (Math.ceil(cbds.left-rbds.left) + cbds.width - 4) + "px";
                            fCellDragger.style.top = (Math.ceil(cbds.bottom-rbds.top) - 4) + "px";
                        }
                        if(!cell){
                            const len = els.length
                            if(len){
                                if(e.clientY > dataTableService.methods.tblBot){
                                    cell = els[(len-1)]
                                }
                                if(e.clientY < dataTableService.methods.tblTop){
                                    cell = els[0]
                                }
                                if(cell && fCellDragger && par){
                                    const cbds = cell.getBoundingClientRect()
                                    const rbds = par.getBoundingClientRect()
                                    fCellDragger.style.left = (Math.ceil(cbds.left-rbds.left) + cbds.width - 4) + "px";
                                    fCellDragger.style.top = (Math.ceil(cbds.bottom-rbds.top) - 4) + "px";
                                }
                            }
                        }
                    }catch(e){}
                }
            },

            getRawNum: function(val) {
                return /\./g.test(val) ? parseFloat(val.replace(/,/g, "")) : parseInt(val.replace(/,/g, ""))
            },

            createValEditInput: function(type, value) {
                if(type === "number" || type === "date"){
                    const inp = document.createElement("input")
                    inp.type = type
                    inp.id = "selEdit" + type;
                    inp.name = "selEdit" + type
                    inp.className = "edit-input"
                    inp.oninput = deebo.methods.execCellEdit
                    inp.onblur = deebo.methods.execCellEdit
                    if(type === "date")
                        inp.onchange = deebo.methods.execCellEdit
                    if(type === "number")
                        inp.onkeyup = deebo.methods.execCellEdit
                    inp.value = type === "date" ? new Date(value)?.toISOString().split("T")[0] : deebo.methods.getRawNum(value);
                    return inp;
                }
                
                if(type === "text"){//select dropdown
                    let i = 0
                    const opts = dataTableService.methods.dataFilSrtTracker[deebo.methods.currEditCol]["selDDVals"]?.
                            filter( function(g) { return g.value !== "(Select All)" }).map( function(s) {return ({ ...s, selected: s.value === value })} )
                    const len = opts.length
                    const cont = document.createElement("div")
                    const optcont = document.createElement("div")
                    cont.className = "relly"
                    cont.className += " edit-input";
                    optcont.className = "edit-input-option-cont";
                    const eopt = document.createElement("div")
                    eopt.tabIndex = 0
                    eopt.className = "edit-input-opt"
                    eopt.onclick = deebo.methods.execCellEdit
                    eopt.textContent = "-";
                    optcont.appendChild(eopt)
                    for(i; i < len; i++){
                        const opt = document.createElement("div")
                        opt.tabIndex = 0
                        opt.className = "edit-input-opt"
                        opt.onclick = deebo.methods.execCellEdit
                        opt.textContent = opts[i].value;
                        optcont.appendChild(opt)
                    }
                    cont.appendChild(optcont)
                    return cont
                }
                return document.createElement("span")
            },

            stopWinSel: function(e) {
                e.preventDefault()
            },

            emitEdit: function(event) {
                const el = event?.target
                const elProp = deebo.methods.getColFrmClsList(el, "data-cell-")
                const filInp = document.getElementById("filter" + elProp)
                const type = filInp?.getAttribute("type")
                if(deebo.methods.cellEditNeedsVal(deebo.methods.replaceUniSep(elProp), el, filInp, type)/*only for validated edits*/ || 
                (event.relatedTarget && event.relatedTarget.classList.contains("edit-input")))
                    return;
                deebo.methods.execCellEdit(event)
                if(el){
                    setTimeout( function() {
                        const actEl = document.activeElement
                        if(actEl && actEl.id === "fCellDragger"){
                            el.classList.add("dragger-cell-focused")
                            window.addEventListener("selectstart", deebo.methods.stopWinSel)
                            window.addEventListener("mousemove", deebo.methods.handleCellDraggerEdit)
                            setTimeout( function() { window.addEventListener("mouseup", deebo.methods.handleDraggerMU) })
                            // deebo.methods.currEditCol = deebo.methods.replaceUniSep(deebo.methods.getColFrmClsList(el, "data-cell-"))
                        } else {
                            if(!actEl || (actEl && !/data-cell/g.test(actEl?.className))){
                                deebo.methods.currEditIndex = -1
                                const fCellDragger = document.getElementsByClassName("focused-cell-dragger")[0]
                                if(fCellDragger){
                                    fCellDragger.style.removeProperty("top")
                                    fCellDragger.style.removeProperty("left")
                                }
                            }
                        }
                    })
                }
            },

            execCellEdit: function(e, forceValue) {
                if(deebo.methods.currEditIndex > -1){
                try{
                    let cfDIdx;
                    const valEl = document.getElementsByClassName("edit-input")[0]
                    const forceVal = forceValue ? forceValue : (document.getElementsByClassName("edit-input-opt").length > 0 ? 
                    (e.target.textContent === "-" ? null : e.target.textContent) : null);//select dd
                    let val = forceVal ? forceVal : (valEl ? valEl.value : e.target.textContent);
                    if(val && typeof val === "string" && document.getElementById("selEditdate"))
                        val = deebo.methods.coerceDate(val)
                    if(val && typeof val === "string" && document.getElementById("selEditnumber"))
                        val = /\./g.test(val) ? parseFloat(val) : parseInt(val);
                    let realProp; let col = "";
                    if(deebo.methods.currEditCol){
                        realProp = deebo.methods.currEditCol
                        col = realProp.replace(/ /g, deebo.methods.uniSep)
                    } else {
                        col = deebo.methods.getColFrmClsList(e.target, "data-cell-")
                        realProp = deebo.methods.replaceUniSep(col)
                    }
                    const filInp = document.getElementById("filter" + col)
                    dataTableService.methods.mainData[deebo.methods.currEditIndex][realProp] = val;
                    const item = dataTableService.methods.mainData[deebo.methods.currEditIndex]
                    if(item){
                        cfDIdx = deebo.methods.findObjIndxInData(item, "currFilData")
                        if(cfDIdx > -1)
                            dataTableService.methods.currFilData[cfDIdx][realProp] = val
                    }
                    const dtType =filInp.getAttribute("type")
                    const notNum = (filInp && (dtType != "number" || /(year|yr|fy)/g.test(realProp.toLocaleLowerCase()))) ? true : false;
                    const useTxt = deebo.methods.figureCellText(val, notNum, dataTableService.methods.dataFilSrtTracker[realProp]?.["colCellSymbol"]);
                    const cell= document.querySelector("#dataTableRow" + deebo.methods.currEditIndex + " .data-cell-" + col)
                    if(useTxt.prop === "textContent"){
                        if(!deebo.methods.currEditCol){//normal free text edit
                            e.target.textContent = useTxt.value;
                        } else {
                            const row = document.getElementById("dataTableRow" + deebo.methods.currEditIndex)
                            if(row){
                                if(cell)
                                    cell.textContent = useTxt.value
                            }
                        }
                    } else
                        e.target.innerHTML = useTxt.value;
                    if(cell && deebo.methods.listenToCellDraggerMouseMove)
                        cell.classList.add("dragger-cell-focused")
                    deebo.methods.blockEventsInCells()
                    // if(useTxt.ancs && useTxt.ancs.length)
                    //     deebo.methods.giveCellAncOptions(deebo.methods.currEditIndex, col, useTxt.ancs)
                    if((e && (e.type === "blur" || e.type === "click")) || deebo.methods.isEnterKey(e))
                        deebo.methods.clearValidatedEdit(e)
                    try{ deeboCellEditHook((deebo.methods.uProvidedPrimKey || deebo.methods.currEditIndex), realProp, val) }catch(e){}
                }catch(e){ }
                }
            },

            checkCellEditOnClick: function() {//for select dd edits only
                const editOpts = document.getElementsByClassName("edit-input-opt")
                if(deebo.methods.currEditIndex > -1 && editOpts.length > 0){
                    deebo.methods.clearValidatedEdit()
                    setTimeout( function() {
                        const actEl = document.activeElement
                        if(!document.getElementsByClassName("edit-input")[0] && deebo.methods.currEditIndex === -1)
                            actEl.blur()
                    })
                }
            },

            handleTheme: function(co1, co2) {
                try{
                    let rule1; let rule1a; let rule2; let rule3; let rule5; let rule6;
                    if(co1){
                        rule1 = ".col-header span, .col-header sup, .col-header button .material-icons," + 
                        ".paginator-half-wid{color: "+co1+"}";
                        rule1a = ".col-header select, .col-header input:not(input[type=file]), #skipTo{box-shadow:0 0 1px 1px "+co1+";" +
                        "-webkit-box-shadow:0 0 1px 1px "+co1+"}";
                    }
                    if(co2){
                        rule2 = ".col-header, .data-table-footer, .btn-fil-comp{background: "+co2+"}"
                        const tblbxSh = "0 -1px 3px 1px ";
                        const tblFbxSh = "0 1px 3px -3px ";
                        if(dataTableService.methods.mainDataLen){
                            rule2 = ".col-header, .btn-fil-comp{background: "+co2+"}"
                            rule3 = ".data-table{ box-shadow: "+tblbxSh + co2+"; -webkit-box-shadow: "+tblbxSh + co2+"; -moz-box-shadow: "+tblbxSh + co2+"}"
                            rule6 = ".data-table-footer{background: "+co2+"; box-shadow: "+tblFbxSh + co2+"; -webkit-box-shadow: "+tblFbxSh + co2+"; -moz-box-shadow: "+tblFbxSh + co2+"}";
                        }
                        rule5 = ".data-cell{ border-bottom: 1px solid "+co2+"; border-right: 1px solid "+co2+"}"
                    }
                    if(rule1 || rule1a || rule2 || rule3 || rule5 || rule6){
                        const el = document.createElement("style")
                        document.head.appendChild(el)
                        if(rule1)
                            el.sheet.insertRule(rule1)
                        if(rule1a)
                            el.sheet.insertRule(rule1a)
                        if(rule2)
                            el.sheet.insertRule(rule2)
                        if(rule3)
                            el.sheet.insertRule(rule3)
                        if(rule5)
                            el.sheet.insertRule(rule5)
                        if(rule6)
                            el.sheet.insertRule(rule6)
                    }
                }catch(e){}
            },

            setUpPaginatorOnTblLoad: function() {
                if(window.innerWidth >= deebo.methods.mouseEventBreak && !deebo.methods.tblFooterListenersAdded){
                    try{
                        const tfoot = document.getElementById("tableFooter")
                        tfoot.addEventListener("mousemove", tblDragEvents.methods.checkPaginatorBorderCursor)
                        tfoot.addEventListener("mousemove", tblDragEvents.methods.handleTableHeightAdjust)
                        tfoot.addEventListener("mousedown", tblDragEvents.methods.handleTableHeightAdjust)
                        tfoot.addEventListener("mouseup", tblDragEvents.methods.handleColResMouseUp)
                        deebo.methods.unbindMouseRemoveEvts(tfoot.firstElementChild)
                        let i = 0
                        const pels = document.getElementsByClassName("paginator-half-wid")
                        const plen = pels.length
                        for(i; i < plen; i++){
                            const pel = pels[i]
                            deebo.methods.unbindMouseRemoveEvts(pel)
                            let n = 0
                            const pkids = pel.children
                            const pklen = pkids.length
                            for(n; n < pklen; n++){
                                const pk = pkids[n]
                                deebo.methods.unbindMouseRemoveEvts(pk)
                            }
                        }
                        deebo.methods.tblFooterListenersAdded = true
                    }catch(e){}
                }
            },

            tblFooterListenersAdded: false,

            figureFilterType: function(col) {
                const item = dataTableService.methods.dataFilSrtTracker[col]
                if(item){
                    switch(item.type){
                        case "string":
                            return "text";
                        case "number":
                            return "number";
                        case "date":
                            return "date"
                        default:
                            return "text";
                    }
                }
                return "text"
            },

            insertSelectComparator: function(col, type) {
                const sel = document.createElement("select")
                sel.id = "selectComp" + col
                sel.className = "select-filter-comparator"
                const eOpt = document.createElement("option")
                eOpt.value = ""
                eOpt.textContent = "Comparison?"
                sel.appendChild(eOpt)
                let i = 0
                const opts = dataTableService.methods.comparatorOpts[type]
                const len = opts.length
                for(i; i < len; i++){
                    const opt = document.createElement("option")
                    opt.value = opts[i]
                    opt.textContent = opts[i]
                    sel.appendChild(opt)
                }
                sel.onchange = deebo.methods.handleComparatorChange
                sel.onclick = function(e){ e && e.stopPropagation()}
                deebo.methods.unbindMouseRemoveEvts(sel)
                return sel
            },

            insertSelectComparatorBtn: function() {
                const div = document.createElement("div")
                const btn = document.createElement("button")
                const ic = document.createElement("i")
                div.className = "inline"
                div.className += " relly"
                div.style.zIndex = "1"
                ic.className = "material-icons"
                ic.textContent = "filter_list"
                ic.ariaHidden = "false"
                btn.className = "btn-fil-comp"
                btn.type = "button"
                btn.appendChild(ic)
                div.appendChild(btn)
                deebo.methods.unbindMouseRemoveEvts(btn)
                deebo.methods.unbindMouseRemoveEvts(ic)
                return div
            },

            handleComparatorChange: function(event) {
                if(event && event.target){
                    const col = event.target.id?.replace(/selectComp/, "")
                    if(col){
                        const field = deebo.methods.replaceUniSep(col)
                        const fil = document.getElementById("filter" + col)
                        if(event.target.value){
                            dataTableService.methods.dataFilSrtTracker[field].comparator = event.target.value
                            const dds = dataTableService.methods.dataFilSrtTracker[field]["selDDVals"]?.length
                            if((fil.value || dds) || (event.target.value === "Not Empty" || event.target.value === "Empty"))
                                deebo.methods.filterOnKeyUp({ target: { id: ("filter" + col), value: (fil.value || "") } })
                        } else {
                            dataTableService.methods.dataFilSrtTracker[field].comparator = null
                            if(fil.value || dataTableService.methods.arefilSrtTrkPropsDefault(true))
                                deebo.methods.filterOnKeyUp({ target: { id: ("filter" + col), value: (fil.value || "") } })
                        }
                    }
                }
            },

            blurContEd: function() {
                const actEl = document.activeElement
                if(actEl && actEl.getAttribute("contenteditable"))
                    actEl.blur()
            },

            setColsOnVisScreen: function() {
                let i = 0
                let vCols = []
                const useCols = document.getElementsByClassName("col-header")
                const len = useCols.length
                for(i; i < len; i++){
                    const el = useCols[i]
                    if(el.classList.contains("col-header-minimized"))
                        continue
                    const elbds = el.getBoundingClientRect()
                    if(elbds.left >= dataTableService.methods.tblLeft && elbds.right < dataTableService.methods.tblRight)
                        vCols.push(deebo.methods.replaceUniSep(el.id.replace(/columnHeader/g, "")))
                }
                dataTableService.methods.visibleCols = vCols.filter( function(v) { return true })
            },

            handleScrlBarDrag: function(event) {
                if(deebo.methods.showCharts)
                    return;
                if(event && event.target && event.target.id === "dataTableBody"){
                    requestAnimationFrame( function() {
                        const dtb = document.getElementById("dataTableBody")
                        if(dtb){
                            deebo.methods.execVertScroll(dtb.scrollTop)
                            deebo.methods.execHorizScroll(dtb.scrollLeft)
                            setTimeout(deebo.methods.blockEventsInCells, 100)
                        }
                    })
                }
            },

            handleScroll: function(event) {
                if(deebo.methods.showCharts)
                    return;
                const left = event.target.scrollLeft
                const top = event.target.scrollTop
                /*horiz scroll*/
                if(left !== deebo.methods.horizRest)
                    window.requestAnimationFrame( function() { deebo.methods.execHorizScroll(left) })
                /*horiz scroll*/
                /*vert scroll*/
                if(top === deebo.methods.verticalRest){
                    deebo.methods.clearValidatedEdit()
                    return deebo.methods.setRowSelChecksPlacement(); 
                }
                window.requestAnimationFrame( function() { deebo.methods.execVertScroll(top) })     
                if(top%2 === 0)
                    deebo.methods.clearValidatedEdit()          
            },

            execHorizScroll: function(left) {
                const head = document.getElementById("dataTableHeaders")
                if(left > 0)
                    head.style.marginLeft = -left + "px"
                else
                    head.style.removeProperty("margin-left")
                deebo.methods.setColsOnVisScreen()
                deebo.methods.execHorizBodyScroll()
                deebo.methods.horizRest = left
                deebo.methods.setColsOnVisScreen()
            },

            scrollDir: "down",

            execVertScroll: function(top) {
                if(top >= deebo.methods.verticalRest){
                    deebo.methods.execVertScrollDown(deebo.methods.columnNames, deebo.methods.columnNames.length)
                    deebo.methods.clearAboveFoldRows()
                    deebo.methods.scrollDir = "down"
                } else {//scrolling back up
                    deebo.methods.execVertScrollUp(deebo.methods.columnNames, deebo.methods.columnNames.length)
                    deebo.methods.clearBelowFoldRows()
                    deebo.methods.scrollDir = "up"
                }
                deebo.methods.verticalRest = top
                if(deebo.methods.rowNumbers && top%2 === 0)
                    deebo.methods.setRowNumbers()
                /*vert scroll*/
            },

            handleScrollEnd: function() {
                if(deebo.methods.showCharts)
                    return;
                setTimeout( function() { 
                    deebo.methods.setColsOnVisScreen()
                    deebo.methods.setRowSelChecksPlacement()
                    if(deebo.methods.listenToCellDraggerMouseMove)
                        deebo.methods.settleCellDragger()
                    setTimeout(deebo.methods.cleanUpPossibles)
                    setTimeout(deebo.methods.blockEventsInCells, 100)
                })
            },

            shouldValidateEdit(col, filInp) {
                const trker = dataTableService.methods.dataFilSrtTracker[col]
                if((filInp && ["number", "date"].indexOf(filInp.getAttribute("type")) > -1) || 
                (trker && trker.selDDVals && trker.selDDVals.length))
                    return true
                return false
            },

            addCell: function(text, prop, row, indx, vis, b4) {
                const cell = document.createElement("div")
                const elProp = prop?.replace(/ /g, deebo.methods.uniSep)
                cell.className = "data-cell"
                cell.className += (" data-cell-" + elProp)
                cell.tabIndex = 0
                if(prop === dataTableService.methods.firstCol)
                    cell.className += " holding-check"
                const dProp = dataTableService.methods.dataFilSrtTracker[prop]
                if(dProp && dProp.minimize)
                    cell.classList.add("col-header-minimized")
                if(vis)
                    deebo.methods.updateCell(cell, prop, elProp, text, indx)
                if(b4)
                    row.insertAdjacentElement("afterbegin", cell)
                else
                    row.appendChild(cell)
                if(row && prop && row.children.length === 1)
                    deebo.methods.createSelectRowCheck(row.getAttribute("data-index"))
            },

            updateCell: function(cell, prop, elProp, text, indx) {
                const head = document.getElementById("columnHeader" + elProp)
                const filInp = document.getElementById("filter" + elProp)
                const canEdit = deebo.methods.editable && !deebo.methods.shouldValidateEdit(prop, filInp);
                const notNum = (filInp && (filInp.getAttribute("type") != "number" || /(year|yr|fy)/g.test(prop.toLocaleLowerCase()))) ? true : false;
                if(head){
                    const cfree = "col-item-freeze"
                    const cmin = "col-header-minimized"
                    if(head.classList.contains(cfree))
                        cell.classList.add(cfree)
                    if(head.classList.contains(cmin))
                        cell.classList.add(cmin)
                }
                if(filInp && filInp.getAttribute("type") === "number")
                    cell.classList.add("data-cell-riiight")
                let useTxt; let sym;
                cell.style.width = dataTableService.methods.dataFilSrtTracker[prop]?.colWidth || deebo.methods.useColWid
                cell.style.height = dataTableService.methods.defltRHgt
                if(dataTableService.methods.dataFilSrtTracker && dataTableService.methods.dataFilSrtTracker[prop]){
                    sym = dataTableService.methods.dataFilSrtTracker[prop]["colCellSymbol"]
                    useTxt = deebo.methods.figureCellText(text, notNum, dataTableService.methods.dataFilSrtTracker[prop]["colCellSymbol"])
                } else {
                    useTxt = deebo.methods.figureCellText(text, notNum)
                }
                if(useTxt.prop === "textContent"){
                    cell.textContent = useTxt.value
                    if(canEdit)
                        cell.setAttribute("contenteditable", "true")
                } else {
                    cell.innerHTML = useTxt.value
                }
                if(sym){
                    let symbolCls = ["$","€","£","¥","₣","₹"].indexOf(sym) > -1 ? "has-symbol-b" : "has-symbol";
                    cell.classList.add(symbolCls)
                    cell.setAttribute("data-symbol", sym)
                }
                // if(useTxt.ancs && useTxt.ancs.length)
                //     deebo.methods.giveCellAncOptions(indx, elProp, useTxt.ancs)
                if(window.innerWidth >= deebo.methods.mouseEventBreak){
                    cell.addEventListener("mousemove", tblDragEvents.methods.checkItemBorderCursor)
                    cell.addEventListener("mousemove", tblDragEvents.methods.handleCellSizeAdjust)
                    cell.addEventListener("mousedown", tblDragEvents.methods.handleCellSizeAdjust)
                }
                if(deebo.methods.editable && useTxt.prop === "textContent"){
                    cell.addEventListener("focus", deebo.methods.setCellToEdit);
                    if(canEdit)
                        cell.addEventListener("blur", deebo.methods.emitEdit);
                    cell.addEventListener("mousedown", deebo.methods.checkCellEditOnClick)
                }
                cell.classList.add("data-visible")
            },

            execHorizBodyScroll: function() {
                const allcols = deebo.methods.getAllColsAtRuntime(null);
                let i = 0;
                const clen = allcols.length
                const rows = document.getElementsByClassName("data-table-row")
                const rlen = rows.length
                const lftPlus = deebo.methods.rowNumbers ? 75 : 0//ctrl+f "--row-num-width" in css
                let positions = []
                const row0 = rows[0]
                for(let p = (clen-1); p >= 0; p--){
                    const col = allcols[p]
                    const elcol = col?.replace(/ /g, deebo.methods.uniSep)
                    const head = document.getElementById("columnHeader" + elcol)
                    if(head){
                        const bds = head.getBoundingClientRect()
                        if(bds.left > dataTableService.methods.tblRight)
                            continue
                        const cell = document.querySelector("#"+row0.id+" .data-cell-" + elcol)
                        if(cell){
                            const isVis = cell.classList.contains("data-visible") || /data-visible/g.test(cell.className);
                            if(!isVis && (dataTableService.methods.visibleCols.includes(col) || (bds.left >= (dataTableService.methods.tblLeft-lftPlus) && bds.right < (dataTableService.methods.tblRight+lftPlus))))//visible
                                positions.push({ col: col, vis: true })
                            if(isVis && !dataTableService.methods.visibleCols.includes(col) && !positions.find( function(p) {return p.col === col}))
                                positions.push({ col: col, vis: false })
                        }
                    }
                }
                const plen = positions.length
                for(i; i < rlen; i++){
                    const row = rows[i]
                    if(row){
                        let c = 0
                        for(c; c < plen; c++){
                            const pos = positions[c]
                            if(pos){
                                const col = pos.col
                                const elcol = col.replace(/ /g, deebo.methods.uniSep)
                                if(pos.vis){
                                    const id = parseInt(row.id.replace(/dataTableRow/g, ""))
                                    const item = dataTableService.methods.mainData[id]
                                    const eCell = document.querySelector("#" + row.id + " .data-cell-" + elcol)
                                    if(eCell)//already there, make visible
                                        deebo.methods.updateCell(eCell, col, elcol, item[col], id)
                                } else {
                                    const rCell = document.querySelector("#" + row.id + " .data-cell-" + elcol)
                                    if(rCell)
                                        rCell.classList.remove("data-visible")
                                }
                            }
                        }
                    }
                }
                setTimeout( function() { 
                    deebo.methods.setColsOnVisScreen() 
                    setTimeout(deebo.methods.cleanUpPossibles)
                }, 50)
            },

            cleanUpPossibles: function() {
                let i = 0
                const rows = document.getElementsByClassName("data-table-row")
                const len = rows.length
                const lftPlus = deebo.methods.rowNumbers ? 75 : 0//ctrl+f "--row-num-width" in css
                for(i; i < len; i++){
                    const row = rows[i]
                    const rId = rows[i].id
                    const id = parseInt(rId.replace(/dataTableRow/g, ""))
                    const item = dataTableService.methods.mainData[id]
                    if(row){
                        let p = 0
                        const rclen = row.children.length
                        if(rclen){
                            for(p; p < rclen; p++){
                                const cell = row.children[p]
                                if(cell && cell.classList.contains("data-cell")){
                                    const elify = deebo.methods.getColFrmClsList(cell, "data-cell-")
                                    const prop = deebo.methods.replaceUniSep(elify)
                                    const el = document.querySelector("#" + row.id + " .data-cell-" + elify)
                                    if((el && el.getBoundingClientRect().right < (dataTableService.methods.tblLeft-lftPlus)) && (el && (!el.innerHTML || !el.getAttribute("style"))))
                                        deebo.methods.updateCell(cell, prop, elify, item[prop], id)//make em all visible
                                }
                            }
                        }
                    }
                }
            },

            execVertScrollDown: function(cols, colLen) {
                let canAdd = 0
                const vlen = dataTableService.methods.visibleCols.length
                const lastVisInd = cols.indexOf(dataTableService.methods.visibleCols[(vlen-1)]) + 1
                const bel = document.getElementById("belowArea")
                const abv = document.getElementById("aboveArea")
                const bbds = bel.getBoundingClientRect()
                const rTop = (bbds.top - deebo.methods.verticalRest)
                const gap = dataTableService.methods.tblBot - rTop
                const defNum = parseInt(dataTableService.methods.defltRHgt.replace(/[ ]?px/g, ""))
                if(gap > 0){
                    let h = 0
                    let z = deebo.methods.lastElRowIndex + 1
                    const last = document.getElementById("dataTableRow" + deebo.methods.lastElRowIndex)
                    if(last && dataTableService.methods.elIsBelowFold(last, dataTableService.methods.tblBot))
                        return;
                    let bhToSub = 0
                    let ahToAdd = 0
                    const rowsInGap = Math.ceil(gap/defNum)
                    canAdd = z+(rowsInGap)
                    const goTo = Math.min(dataTableService.methods.currFilData.length, canAdd)
                    const frag = document.createDocumentFragment()
                    for(z; z < goTo; z++){
                        const wldBeElTop = bbds.top + (defNum*h);
                        const wldBeElBot = wldBeElTop+defNum
                        if(wldBeElBot < dataTableService.methods.tblTop){
                            ahToAdd += defNum
                            bhToSub += defNum
                        } else {
                            if(wldBeElTop <= dataTableService.methods.tblBot){
                                const item = dataTableService.methods.currFilData[z]
                                const index = dataTableService.methods.currMapping[z] || deebo.methods.findObjIndxInData(item)
                                const idOfInt = "dataTableRow" + index
                                if(index > -1 && !document.getElementById(idOfInt)){
                                    const row = document.createElement("div")
                                    row.id = idOfInt
                                    row.className = "data-table-row"
                                    row.setAttribute("data-index", index)
                                    row.style.width = deebo.methods.useRowWid
                                    row.style.height = dataTableService.methods.defltRHgt
                                    if(!dataTableService.methods.displayOnlySelRows && dataTableService.methods.currSelRows.indexOf(index) > -1)
                                        row.classList.add("data-row-selected")
                                    // bel.insertAdjacentElement("beforebegin", row)
                                    frag.appendChild(row)
                                    for(let k = (colLen-1); k >= 0; k--){
                                        const col = cols[k]
                                        if(col)
                                            deebo.methods.addCell(item[col], col, row, index, (k <= lastVisInd), true)//prepend
                                    }
                                    bhToSub += defNum
                                }
                            }
                        }
                        h += 1
                    }
                    bel.before(frag)
                    if(bhToSub){
                        deebo.methods.belowHgt -= bhToSub
                        bel.style.height = Math.max(0, deebo.methods.belowHgt) + "px"
                    }
                    if(ahToAdd){
                        deebo.methods.aboveHgt += ahToAdd
                        abv.style.height = Math.max(0, deebo.methods.aboveHgt) + "px"
                    }
                    deebo.methods.setLastRowIndex()
                }
            },

            execVertScrollUp: function(cols, colLen) {
                const vlen = dataTableService.methods.visibleCols.length
                const lastVisInd = cols.indexOf(dataTableService.methods.visibleCols[(vlen-1)]) + 1;
                const ael = document.getElementById("aboveArea")
                const blw = document.getElementById("belowArea")
                const abds = ael.getBoundingClientRect()
                const defNum = parseInt(dataTableService.methods.defltRHgt.replace(/[ ]?px/g, ""))
                const rbot = abds.bottom
                const gap = rbot - dataTableService.methods.tblTop
                if(gap > 0){
                    let h = 0
                    const rlen = document.getElementsByClassName("data-table-row").length
                    let z = (deebo.methods.lastElRowIndex - rlen)
                    if(z < 0)
                        return
                    let bhToAdd = 0
                    let ahToSub = 0
                    const rowsInGap = Math.ceil(gap/defNum)
                    const min = Math.max(0, (z-rowsInGap))
                    const frag = document.createDocumentFragment()
                    for(z; z >= min; z--){
                        const wldBeElBot = rbot - (defNum*h);
                        const wldBeElTop = wldBeElBot-defNum
                        if(wldBeElTop > dataTableService.methods.tblBot){
                            bhToAdd += defNum
                            ahToSub += defNum
                        } else {
                            if(wldBeElBot > dataTableService.methods.tblTop){
                                const item = dataTableService.methods.currFilData[z]
                                const index = dataTableService.methods.currMapping[z] || deebo.methods.findObjIndxInData(item)
                                if(index > -1){
                                    const row = document.createElement("div")
                                    row.id = "dataTableRow" + index
                                    row.className = "data-table-row"
                                    row.setAttribute("data-index", index)
                                    row.style.width = deebo.methods.useRowWid
                                    row.style.height = dataTableService.methods.defltRHgt
                                    if(!dataTableService.methods.displayOnlySelRows && dataTableService.methods.currSelRows.indexOf(index) > -1)
                                        row.classList.add("data-row-selected")
                                    frag.prepend(row)
                                    // ael.insertAdjacentElement("afterend", row)
                                    let k = 0
                                    for(k; k < colLen; k++){
                                        const col = cols[k]
                                        if(col)
                                            deebo.methods.addCell(item[col], col, row, index, (k <= lastVisInd))
                                    }
                                    ahToSub += defNum
                                }
                            }
                        }
                        h += 1
                    }
                    ael.after(frag)
                    if(ahToSub){
                        deebo.methods.aboveHgt -= ahToSub
                        ael.style.height = Math.max(0, deebo.methods.aboveHgt) + "px"
                    }
                    if(bhToAdd){
                        deebo.methods.belowHgt += bhToAdd
                        blw.style.height = Math.max(0, deebo.methods.belowHgt) + "px"
                    }
                }
            },

            getRowsWithContentVert: function(ab) {//with children
                let i = 0
                let rows = []
                const els = document.getElementsByClassName("data-table-row")
                const len = els.length
                for(i; i < len; i++){
                    const row = els[i]
                    if(row){
                        if(ab === "below" && dataTableService.methods.elIsBelowFold(row, dataTableService.methods.tblBot))
                            rows.push(row.id)
                        if(ab === "above" && dataTableService.methods.elIsAboveFold(row, dataTableService.methods.tblTop))
                            rows.push(row.id)
                    }
                }
                return rows
            },

            clearAboveFoldRows: function() {
                const justids = deebo.methods.getRowsWithContentVert("above")
                const changes = justids.length
                if(changes > 0){
                    const dtb = document.getElementById("dataTableBody")
                    const ael = document.getElementById("aboveArea")
                    const defNum = parseInt(dataTableService.methods.defltRHgt.replace(/[ ]?px/g, ""))
                    const els = document.getElementsByClassName("data-table-row")
                    const dtChks = document.getElementById("dataTableChecks")
                    const len = els.length
                    for(i = (len-1); i >= 0; i--){
                        const el = els[i]
                        if(el && justids.includes(el.id)){
                            const indx = el.id.replace(/dataTableRow/g, "")
                            dtb.removeChild(el)
                            const chk =document.getElementById("checkDataTableRow" + indx)
                            if(chk)
                                dtChks.removeChild(chk)
                        }
                    }
                    const ind1 = parseInt(document.getElementsByClassName("data-table-row")[0]?.getAttribute("data-index"))
                    const item = dataTableService.methods.mainData[(ind1 || -1)]
                    if(item){
                        deebo.methods.aboveHgt = deebo.methods.findObjIndxInData(item, "currFilData")*defNum
                        ael.style.height = Math.max(0, deebo.methods.aboveHgt) + "px"
                    }
                }
            },

            clearBelowFoldRows: function() {
                const justids = deebo.methods.getRowsWithContentVert("below")
                let changes = justids.length
                if(changes > 0){
                    const dtb = document.getElementById("dataTableBody")
                    const blw = document.getElementById("belowArea")
                    const defNum = parseInt(dataTableService.methods.defltRHgt.replace(/[ ]?px/g, ""))
                    const els = document.getElementsByClassName("data-table-row")
                    const dtChks = document.getElementById("dataTableChecks")
                    const len = els.length
                    for(let i = (len-1); i >= 0; i--){
                        const el = els[i]
                        if(el && justids.includes(el.id)){
                            const indx = el.id.replace(/dataTableRow/g, "")
                            dtb.removeChild(el)
                            const chk =document.getElementById("checkDataTableRow" + indx)
                            if(chk)
                                dtChks.removeChild(chk)
                        }
                    }
                    const nwdtrs = document.getElementsByClassName("data-table-row")
                    const rlen = nwdtrs.length
                    const indlst = parseInt(nwdtrs[(rlen-1)]?.getAttribute("data-index"))
                    const item = dataTableService.methods.mainData[(indlst || -1)]
                    if(item){
                        deebo.methods.belowHgt = ((dataTableService.methods.currFilData.length-1)-deebo.methods.findObjIndxInData(item, "currFilData"))*defNum
                        blw.style.height = Math.max(0, deebo.methods.belowHgt) + "px"
                    }
                    deebo.methods.setLastRowIndex()
                }
            },

            setDataRowWidthsOnMinimize: function(width) {
                let i = 0;
                const rows = document.getElementsByClassName("data-table-row")
                const rLen = rows.length
                const wid = width + "px"
                for(i; i < rLen; i++){
                    const row = rows[i]
                    row.style.width = wid
                }
            },

            titleCase: function(str) {
                if(!str || str === "")
                    return str
                return str.replace(/\w\S*/g, function(txt){
                    return txt.charAt(0).toUpperCase() + txt.substring(1);
                });
            },

            insertColumnHeader: function(col, head, allowFreeze) {
                try{
                    const div = document.createElement("div")
                    const name = document.createElement("span")
                    const arr = document.createElement("button")
                    const iArr = document.createElement("i")
                    const min = document.createElement("button")
                    const xfil = document.createElement("button")
                    const iMin = document.createElement("i")
                    const inp = document.createElement("input")
                    div.style.width = deebo.methods.useColWid
                    div.className = "col-header"
                    const prettyCol = deebo.methods.titleCase(col)
                    col = deebo.methods.stripSpecChars(col)
                    const useCol = col.replace(/ /g, deebo.methods.uniSep)
                    div.id = "columnHeader" + useCol
                    name.textContent = prettyCol
                    name.id = "header" + useCol
                    arr.type = "button"
                    arr.id = "btnSort" + useCol
                    arr.className = "data-sort-arr"
                    iArr.className = "material-icons"
                    iArr.textContent = "arrow_upward"
                    name.onclick = deebo.methods.doSortOnClick
                    arr.appendChild(iArr)
                    arr.onclick = deebo.methods.doSortOnClick
                    min.type = "button"
                    min.id = "btnMin" + useCol
                    min.className = "btn-min-col"
                    iMin.className = "material-icons"
                    iMin.textContent = "minimize"
                    min.appendChild(iMin)
                    min.onclick = deebo.methods.minimizeColumn
                    xfil.id = "xfil" + useCol//dont chhange
                    xfil.className = "hide"
                    xfil.innerHTML = "&times;";
                    xfil.onclick = deebo.methods.resetColFilter
                    const inputType = deebo.methods.figureFilterType(col)
                    inp.type= inputType
                    inp.name = "filter" + useCol
                    inp.id = "filter" + useCol//dont chhange
                    if(inputType === "text" || inputType === "number"){
                        inp.onkeyup = deebo.methods.filterOnKeyUp
                        inp.oninput = deebo.methods.filterOnKeyUp
                        if(inputType === "text")
                            inp.maxLength = 255
                    }
                    if(inputType === "date")
                        inp.onchange = deebo.methods.filterOnKeyUp
                    inp.onclick = function(e) { e && e.stopPropagation() }
                    inp.addEventListener("focus", deebo.methods.killSelFilOpts)
                    div.appendChild(name)//keep first
                    div.appendChild(arr)
                    div.appendChild(min)
                    if(allowFreeze && CSS && CSS.supports && CSS.supports("position", "sticky")){//give freeze pane ability
                        const btnfz = document.createElement("button")
                        btnfz.type = "button"
                        const ifz = document.createElement("i")
                        btnfz.id = "btnFreeze" + useCol
                        btnfz.className = "btn-freeze-col"
                        ifz.className = "material-icons"
                        ifz.textContent = "featured_play_list"
                        btnfz.appendChild(ifz)
                        btnfz.onclick = deebo.methods.freezeColOnClick
                        deebo.methods.unbindMouseRemoveEvts(btnfz)
                        div.appendChild(btnfz)
                    }
                    div.appendChild(document.createElement("br"))
                    div.appendChild(xfil)
                    div.appendChild(inp)
                    div.appendChild(deebo.methods.insertSelectComparator(useCol, inputType))
                    div.appendChild(deebo.methods.insertSelectComparatorBtn())
                    if(window.innerWidth >= deebo.methods.mouseEventBreak){
                        div.addEventListener("mousemove", tblDragEvents.methods.checkItemBorderCursor)
                        div.addEventListener("mousemove", tblDragEvents.methods.handleHeaderSizeAdjust)
                        div.addEventListener("mousedown", tblDragEvents.methods.handleHeaderSizeAdjust)
                        div.addEventListener("mouseup", tblDragEvents.methods.handleColResMouseUp)
                        deebo.methods.unbindMouseRemoveEvts(name)
                        deebo.methods.unbindMouseRemoveEvts(arr)
                        deebo.methods.unbindMouseRemoveEvts(min)
                        deebo.methods.unbindMouseRemoveEvts(inp)
                        deebo.methods.unbindMouseRemoveEvts(xfil)
                    }
                    div.addEventListener("dblclick", tblDragEvents.methods.handleColResDblClick)
                    head.appendChild(div)
                }catch(e){ }
            },

            getDataColumns: function(data) {
                let i = 0
                let cols = Object.keys(data[0])
                const len = data.length
                for(i; i < len; i++){
                    const obj = data[i]
                    const keys = Object.keys(obj)
                    const notInCols = keys.filter( function(k) { return cols.indexOf(k) < 0 })
                    if(typeof obj === "object" && notInCols.length){
                        let n = 0
                        const dLen = notInCols.length
                        for(n; n < dLen; n++)
                            cols.push(notInCols[n])
                    }
                }
                let f =0
                let fincols = []
                const strpdcols = cols.map( function(c) {return deebo.methods.stripSpecChars(c) })
                const slen = strpdcols.length
                for(f; f < slen; f++){
                    const scol = strpdcols[f]
                    if(fincols.indexOf(scol) < 0)
                        fincols.push(scol)  
                }
                return fincols
            },

            saveTheme: function(event) {
                try{
                    const trigBy = event?.target.id
                    const noCloseTrigs = [ "desTblHeight"]
                    const th = event?.target.value
                    if(th && !isNaN(parseInt(th.toString()))){
                        deebo.methods.dTblHeight = parseInt(th)
                        if(event && dataTableService.methods.mainData){//don't wanna set tbl hgt on page load
                            requestAnimationFrame( function() { 
                                document.getElementById("dataTableBody").style.height = (th + "px") 
                                if(deebo.methods.rowNumbers)
                                    try{ document.getElementById("rowNumHeader").nextElementSibling.style.height = th + "px" }catch(e){}
                                const charts = document.getElementsByClassName("selected-row-insights")[0]
                                if(charts){
                                    const hhgt = document.getElementById("dataTableHeaders")?.getBoundingClientRect().height
                                    const scrC = document.getElementsByClassName("sel-ins-scrl-cont")[0]
                                    const elHt = (hhgt+th)
                                    charts.style.height = (elHt + "px")
                                    const sH2 = document.querySelector(".selected-row-insights h2")
                                    if(scrC && sH2)
                                        scrC.style.height = (elHt-sH2.getBoundingClientRect().height-52) + "px";
                                }
                            })
                        }
                    }
                    if(trigBy && noCloseTrigs.indexOf(trigBy) > -1)
                        return;
                }catch(e){}
            },

            idCol: function(col) { 
                if(col && (col === "id" || col === "ID" || col === "Id" || /[Z+z+][I+i+][P+p+][ _\-]?/g.test(col)) || /[S+s+][S+s+][N+n+][ _\-]?/g.test(col))
                    return true
                return col && typeof col === "string" && col.toLocaleLowerCase().endsWith("id") && /[-_ ][I+i+][D+d+]/g.test(col)
            },

            mapLongDate: function(val) {
                let dtStr = ""
                let yrStr = ""
                const dt = val.match(/\d{1,2}\,/g)
                const yr = val.match(/ \d{4}/g)
                if(dt && dt.length)
                    dtStr = dt[(dt.length-1)]
                if(yr && yr.length)
                    yrStr = yr[(yr.length-1)]
                if(!dt || !yr)
                    return new Date(val)
                return new Date(yrStr + "," + deebo.methods.mapTxtMonths(val) + "," + dtStr)
            },

            mapTxtMonths: function(val) {
                if(/(jan|january)/g.test(val))
                    return "01"
                if(/(feb|february)/g.test(val))
                    return "02"
                if(/(mar|march)/g.test(val))
                    return "03"
                if(/(apr|april)/g.test(val))
                    return "04"
                if(/may/g.test(val))
                    return "05"
                if(/(jun|june)/g.test(val))
                    return "06"
                if(/(jul|july)/g.test(val))
                    return "07"
                if(/(aug|august)/g.test(val))
                    return "08"
                if(/(sept|september)/g.test(val))
                    return "09"
                if(/(oct|october)/g.test(val))
                    return "10"
                if(/(nov|november)/g.test(val))
                    return "11"
                if(/(dec|december)/g.test(val))
                    return "12"
                return "06"
            },

            testShortDate: function(val) {
                const isDtReg = new RegExp(/\d+(\/|-| )\d+(\/|-| )\d+/)
                if(val && isDtReg.test(val) && /^\d+$/g.test(val.replace(/(\/|-| )/g, "")) && val.length <= 10)
                    return true
                return false
            },

            testISODate: function(val) {
                return (val && /\d{4}-[01]\d-[0-3]\d(T|t)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|(Z|z))/.test(val)) ? true : false
            },

            testLongDate: function(val) {
                const dtReg = /(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sept|september|oct|october|nov|november|dec|december) \d{1,2}\, \d{4}/
                if(val && dtReg.test(val) && val.length < 29)
                    return true
                return false
            },

            coerceDate: function(val) {
                try{
                    if(!val)
                        return null
                    if(deebo.methods.testLongDate(val))
                        return deebo.methods.mapLongDate(val)
                    const fFour = val.substring(0,4)
                    const moGuess = val.substring(5,7)
                    const dtGuess = val.substring(8,10)//2024-10-30
                    if((deebo.methods.testISODate(val.replace(/ /g, "")) || (/^\d+$/g.test(fFour) && /^\d+$/g.test(moGuess) && /^\d+$/g.test(dtGuess))))
                        return new Date(fFour + "," + moGuess + "," + dtGuess)
                    if(/\d{2}(\/|-| )\d{2}(\/|-| )\d{4}/g.test(val))//10-30-2023
                        return new Date(val.substring(6,10) + "," + (val.substring(0,2)) + "," + val.substring(3,5))
                    if(/\d{2}(\/|-| )\d{1}(\/|-| )\d{4}/g.test(val))//10-5-2023
                        return new Date(val.substring(5,9) + "," + (val.substring(0,2)) + "," + ("0"+val.substring(3,4)))
                    if(/\d{1}(\/|-| )\d{2}(\/|-| )\d{4}/g.test(val))//5-26-2025
                        return new Date(val.substring(5,9) + "," + ("0"+val.substring(0,1)) + "," + val.substring(2,4))
                    if(/\d{1}(\/|-| )\d{1}(\/|-| )\d{4}/g.test(val))//5-6-2025
                        return new Date(val.substring(4,8) + "," + ("0"+val.substring(0,1)) + "," + ("0"+val.substring(2,3)))

                    if(/\d{2}(\/|-| )\d{2}(\/|-| )\d{2}/g.test(val))//10-30-23
                        return new Date(("20" + val.substring(6,8)) + "," + (val.substring(0,2)) + "," + val.substring(3,5))
                    if(/\d{2}(\/|-| )\d{1}(\/|-| )\d{2}/g.test(val))//11-6-25
                        return new Date(("20" + val.substring(5,7)) + "," + (val.substring(0,2)) + "," + ("0"+val.substring(3,4)))
                    if(/\d{1}(\/|-| )\d{2}(\/|-| )\d{2}/g.test(val))//5-12-25
                        return new Date(("20" + val.substring(5,7)) + "," + ("0"+val.substring(0,1)) + "," + val.substring(2,4))
                    if(/\d{1}(\/|-| )\d{1}(\/|-| )\d{2}/g.test(val))//5-6-25
                        return new Date(("20" + val.substring(4,6)) + "," + ("0"+val.substring(0,1)) + "," + ("0"+val.substring(2,3)))
                    
                    if(/\d{4}(\/|-| )\d{2}(\/|-| )\d{2}/g.test(val))//2025-12-18
                        return new Date(val.substring(0,4) + "," + (val.substring(5,7)) + "," + val.substring(8,10))
                    if(/\d{4}(\/|-| )\d{2}(\/|-| )\d{1}/g.test(val))//2025-12-6
                        return new Date(val.substring(0,4) + "," + (val.substring(5,7)) + "," + ("0"+val.substring(8,9)))
                    if(/\d{4}(\/|-| )\d{1}(\/|-| )\d{2}/g.test(val))
                        return new Date(val.substring(0,4) + "," + ("0"+val.substring(5,6)) + "," + val.substring(7,9))
                    if(/\d{4}(\/|-| )\d{1}(\/|-| )\d{1}/g.test(val))//2025-6-5
                        return new Date(val.substring(0,4) + "," + ("0"+val.substring(5,6)) + "," + ("0"+val.substring(7,8)))
                    return val
                } catch(e){
                    return val
                }
            },

            isADateObject: function(val) {
                return val && typeof val === "object" && typeof val.getTime === "function"
            },

            stripSpecChars: function(word) {
                try{
                    const okword = word?.trim().replace(/[~_\-]/g, " ").replace(/[`!@#$%^&*()|+=?;:'",.<>\{\}\[\]\\\/]/g, "").replace(/   /g, " ").replace(/  /g, " ").replace(/^\d+/, '').trim()
                    return okword
                } catch(e){ return word }
            },

            doBigData: function(num) {
                try{
                    let str = num ? num.toLocaleString(undefined, { maximumFractionDigits: 1 }).split(".")[0] : '0'
                    if(num){
                        let arr = str.split(",")
                        let dec;
                        if(arr.length > 0)
                            dec = arr[1].substring(0, 1)
                        str = str.
                        replace(/,\d{3},\d{3},\d{3}/, (dec === "0" ? "B" : ("." + dec + "B"))).
                        replace(/,\d{3},\d{3}/, (dec === "0" ? "M" : ("." + dec + "M"))).
                        replace(/,\d{3}/, (dec === "0" ? "K" : ("." + dec + "K")))
                    }
                    return str
                } catch(e){
                    return num ? num.toLocaleString(undefined, { maximumFractionDigits: 1 }).
                    replace(/,\d{3},\d{3},\d{3}/,"B").
                    replace(/,\d{3},\d{3}/,"M").
                    replace(/,\d{3}/,"K") : '0'
                }
            },

            mystartsWith: function(str, query) {
                try{
                    var qLen = query.length
                    return str.substring(0, qLen) === query ? true : false
                }catch(e){ return false }
            },

            isEnterKey: function(event) {
                if(event){
                    if (typeof event.key !== "undefined") {
                        return event.key === 'Enter'
                    } else if (typeof event.keyIdentifier !== "undefined") {
                        return event.keyIdentifier === 'Enter'
                    } else if (typeof event.keyCode !== "undefined") {
                        return event.keyCode === 13
                    }
                    return false
                }
                return false
            },

            dontSan: function(val) {
                if(val && (deebo.methods.testShortDate(val) || deebo.methods.testISODate(val)))
                    return true
                return false
            },

            sanitizeUi: function(val) {
                if(val){
                    if(deebo.methods.dontSan(val))
                        return val;
                    entityMap = {
                        '<': '&lt;',
                        '>': '&gt;',
                    };
        
                    return typeof val === "string" ? val.replace(/[<>]/g, function (s) {
                        return entityMap[s];
                    }) : val
                } else
                return val === 0 ? val : ''
            },

            getRgbParts: function(rgb) {
                try{
                    const clst = rgb.replace(/rgb[\(\)]/g, "").split(",")
                    return {r: parseInt(clst[0].trim()), g: parseInt(clst[1].trim()), b: parseInt(clst[2].trim())}
                } catch(e) { return {r: 255, g: 255, b: 255} }
            },

            componentToHex: function(c) {
                const hex = c.toString(16);
                return hex.length == 1 ? "0" + hex : hex;
            },

            rgbToHex: function(r, g, b) {
                return "#" + deebo.methods.componentToHex(r) + deebo.methods.componentToHex(g) + deebo.methods.componentToHex(b);
            },

            hexToRgb: function(hex) {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16)
                } : null;
            },

            figureCellText: function(text, notNum, symbol) {
                if(deebo.methods.isADateObject(text))
                    return { prop: "textContent", value: text.toLocaleDateString() }
                if((text && deebo.methods.badStrings.indexOf(text) < 0) || (text === 0)){
                    if(notNum){
                        const isProd = true;
                        if(/[<>]/g.test(text) || (!/(blob:)?((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-:]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w\-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w\.\/-]*))?)/g.test(text)))
                            return { prop: "textContent", value: text }
                        let useText = text
                        const urls = text.matchAll(/(blob:)?((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-:]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w\-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w\.\/-]*))?)/g)
                        if(urls){
                            try{
                                let imgs = []
                                let ancs = []
                                const blobSchm = (isProd ? "blob:https://" : "blob:http://")
                                const blobUrl = blobSchm + location.host
                                let i = 0; let a = 0
                                for(const url of urls){
                                    const low = (url[0] && typeof url[0] === "string") ? url[0].toLocaleLowerCase() : "";
                                    if((deebo.methods.mystartsWith(low, "https") || deebo.methods.mystartsWith(low, blobUrl)) && /(blob|\.)/g.test(low)){
                                        if(imgs.indexOf(url[0]) < 0 && (deebo.methods.mystartsWith(low, blobUrl) ||
                                        /\.(webp|jpeg|jpg|png|jfif|pjpeg|pjp|avif)/g.test(url[0].toLocaleLowerCase()))){
                                            imgs.push(url[0].split("?")[0])
                                        } else {
                                            if(ancs.indexOf(url[0]) < 0)
                                                ancs.push(url[0]/*.split("?")[0]*/)
                                        }
                                    }
                                }
                                const ilen = imgs.length
                                const alen = ancs.length
                                for(i; i < ilen; i++)
                                    useText = useText.replace(new RegExp(imgs[i], "g"), ' <img src="'+imgs[i]+'" alt="Image in cell data" /> ')
                                for(a; a < alen; a++){//only get ones with space at first
                                    const anc = ancs[a]
                                    useText = useText.replace(new RegExp((anc.replace(/\?/g, "\\?") + " "), "g"), (' <a href="'+anc+'" target="_blank">'+anc+'</a> '))
                                    if(useText.endsWith(anc))
                                        useText = useText.replace(new RegExp(" " + anc.replace(/\?/g, "\\?"), "g"), (' <a href="'+anc+'" target="_blank">'+anc+'</a>'))
                                    if(useText === anc)
                                        useText = useText.replace(new RegExp(anc.replace(/\?/g, "\\?"), "g"), ('<a href="'+anc+'" target="_blank">'+anc+'</a>'))
                                }
                                if(imgs.length || ancs.length)
                                    return { prop: "innerHTML", value: useText, ancs: ancs }
                                return { prop: "textContent", value: deebo.methods.sanitizeUi(text) };
                            }catch(e){ return { prop: "textContent", value: deebo.methods.sanitizeUi(text) } }
                        }
                        return { prop: "textContent", value: deebo.methods.sanitizeUi(text) }
                    }
                    try{
                        const minFracDigs = (symbol && ["$","€","£","¥","₣","₹"].indexOf(symbol) > -1) ? 2 : 0;
                        if(typeof text === "number")
                            return { prop: "textContent", value: text.toLocaleString(undefined, { minimumFractionDigits: minFracDigs, maximumFractionDigits: 2 }) }
                        const numVal =  /\./g.test(text) ? parseFloat(text) : parseInt(text);
                        if(!isNaN(numVal))
                            return { prop: "textContent", value: numVal.toLocaleString(undefined, { minimumFractionDigits: minFracDigs, maximumFractionDigits: 2 }) }
                        return { prop: "textContent", value: deebo.methods.sanitizeUi(text) }
                    } catch(e){
                        return { prop: "textContent", value: deebo.methods.sanitizeUi(text) }
                    }
                }
                return { prop: "textContent", value: " " };
            },

            giveCellAncOptions: function(index, elCol, ancs) {
                // let err;
                // try{ let p = new DOMParser() }catch(e){ err = true }
                // if(typeof document.querySelectorAll === "function" && !err && ancs.some( function(a) { return deebo.methods.mystartsWith(a, "https") })){
                //     if(!elCol)//prim
                //         deebo.methods.linkCell = ("#dataTableRow" + index + " a")
                //     else
                //         deebo.methods.linkCell = ("#dataTableRow" + index + " .data-cell-" + elCol + " a")
                //     const exsts = deebo.methods.linkCells.filter( function(c) { return c.cell === deebo.methods.linkCell })
                //     if(exsts.length){//they already said to do it or not on this cell
                //         if(exsts[0].optOut)
                //             return false;
                //         return deebo.methods.processCellLinks()
                //     }
                //     deebo.methods.processCellLinks()
                // }
            },

            processCellLinks: function(e) {//keep the confitm open as the links load to keep the mem obj
                if(deebo.methods.linkCell){//theres at least 1
                    let i = 0
                    let ok = 0; let bad = 0
                    const ancs = document.querySelectorAll(deebo.methods.linkCell)
                    const len = ancs.length
                    let cellData = deebo.methods.linkCells.filter( function(c) { return c.cell === deebo.methods.linkCell })[0];
                    const handleDone = function(k, b) {
                        if((k+b) === len)
                            deebo.methods.linkCell = null
                    }
                    if(!len)
                        handleDone(ok, bad)
                    for(i; i < len; i++){
                        const anc = ancs[i]
                        const href = anc.getAttribute("href")
                        const exsts = cellData?.links.filter( function(d) { return d.href === href })[0]
                        if(cellData && cellData.optOut){
                            ok += 1
                            handleDone(ok, bad)
                            continue
                        }
                        if(!cellData || !exsts){
                            if(deebo.methods.mystartsWith(href, "https")){
                                const xhr = new XMLHttpRequest();
                                xhr.onreadystatechange = function(e) {
                                    if(xhr.readyState === 4){
                                        let dObj = { href: href, title: "", image: "" }
                                        try{
                                            if(xhr.status === 200){
                                                ok += 1
                                                try{
                                                    const parser=new DOMParser();
                                                    const xmlDoc=parser.parseFromString(xhr.responseText, "text/html");
                                                    const otitle = (xmlDoc.querySelector("meta[property=\"og:title\"]") || 
                                                    xmlDoc.querySelector("meta[name=\"og:title\"]"))?.getAttribute("content");
                                                    const oImg = (xmlDoc.querySelector("meta[property=\"og:image\"]") || 
                                                    xmlDoc.querySelector("meta[name=\"og:image\"]") || xmlDoc.querySelector("meta[property=\"twitter:image\"]") ||
                                                    xmlDoc.querySelector("meta[name=\"twitter:image\"]"));
                                                    if(oImg){
                                                        const img = document.createElement("img")
                                                        if(otitle)
                                                            img.alt = otitle
                                                        else
                                                            img.alt = "Image in cell"
                                                        const imSrc = oImg.getAttribute("content").split("?")[0]
                                                        img.onload = deebo.methods.setRowHgtOnImgLoad
                                                        img.onerror = function(e) { e.target.parentElement.removeChild(e.target)}
                                                        img.src = imSrc
                                                        dObj.image = imSrc
                                                        anc.insertAdjacentElement("afterend", img)
                                                    }
                                                    if(otitle){
                                                        const sanTit = otitle
                                                        anc.classList.add("cell-og-link")
                                                        anc.setAttribute("data-title", sanTit)
                                                        anc.parentElement.style.removeProperty("line-height")
                                                        dObj.title = sanTit
                                                    }
                                                    if(!cellData){
                                                        deebo.methods.linkCells.push({cell: deebo.methods.linkCell, links: [dObj]})
                                                    } else {
                                                        deebo.methods.linkCells = deebo.methods.linkCells.map( function(l) {
                                                            if(l.cell === deebo.methods.linkCell)
                                                                l.links.push(dObj)
                                                            return l
                                                        })
                                                    }
                                                }catch(e){}
                                                handleDone(ok, bad)
                                            } else {
                                                bad += 1
                                                if(!cellData){
                                                    deebo.methods.linkCells.push({cell: deebo.methods.linkCell, links: [dObj]})
                                                } else {
                                                    deebo.methods.linkCells = deebo.methods.linkCells.map( function(l) {
                                                        if(l.cell === deebo.methods.linkCell)
                                                            l.links.push(dObj)
                                                        return l
                                                    })
                                                }
                                                handleDone(ok, bad)
                                            }
                                        }catch(e){
                                            bad += 1
                                            if(!cellData){
                                                deebo.methods.linkCells.push({cell: deebo.methods.linkCell, links: [dObj]})
                                            } else {
                                                deebo.methods.linkCells = deebo.methods.linkCells.map( function(l) {
                                                    if(l.cell === deebo.methods.linkCell)
                                                        l.links.push(dObj)
                                                    return l
                                                })
                                            }
                                            handleDone(ok, bad)
                                        }
                                    }
                                }
                                xhr.open("GET", href, true);
                                xhr.timeout = 5900
                                xhr.ontimeout = function(e) { 
                                    bad += 1
                                    handleDone(ok, bad)
                                }
                                xhr.send();
                            } else {
                                bad += 1//not https
                                handleDone(ok, bad)
                            }
                        } else {//put it back from memory
                            ok += 1
                            const cell = document.querySelector(cellData.cell)
                            if(cell){
                                let o = 0
                                const olen = cellData.links.length
                                for(o; o < olen; o++){
                                    const cData = cellData.links[o]
                                    const canc = document.querySelector(cellData.cell + "[href=\""+cData.href+"\"]")
                                    if(canc){
                                        if(cData.image && !document.querySelector(cellData.cell.replace(/ a/g, " img[src=\""+cData.image+"\"]"))){
                                            const cimg = document.createElement("img")
                                            if(cData.title)
                                                cimg.alt = cData.title
                                            else
                                                cimg.alt = "Image in cell"
                                            cimg.onload = deebo.methods.setRowHgtOnImgLoad
                                            cimg.onerror = function(e) { e.target.parentElement.removeChild(e.target)}
                                            cimg.src = cData.image
                                            canc.insertAdjacentElement("afterend", cimg)
                                        }
                                        if(cData.title){
                                            canc.classList.add("cell-og-link")
                                            canc.setAttribute("data-title", cData.title)
                                            canc.parentElement.style.removeProperty("line-height")
                                        }
                                    }
                                }
                            }
                            handleDone(ok, bad)
                        }
                    }
                }
            },

            setRowHgtOnImgLoad: function(e){
                if(e && e.target && (e.target.parentElement && /data-cell/g.test(e.target.parentElement.className)) || 
                  (e.target.parentElement.parentElement && /data-cell/g.test(e.target.parentElement.parentElement.className))){
                    let cell;
                    if(/data-cell/g.test(e.target.parentElement.className))
                        cell = e.target.parentElement
                    if(/data-cell/g.test(e.target.parentElement.parentElement.className))
                        cell = e.target.parentElement.parentElement
                    if(cell){
                        const cTop = cell?.getBoundingClientRect().top
                        const imgB = (e.target?.getBoundingClientRect().bottom + 13)
                        deebo.methods.setSingleRowHgt((imgB - cTop), cell.parentElement, true) 
                    }
                }
            },

            setSingleRowHgt: function(val, row, force) {
                let z = 0;
                const lcLen = row.children?.length
                const rHgt = force ? val : Math.max(val, (deebo.methods.desRowHeight || Math.ceil(row.getBoundingClientRect().height)))
                const useHgt = Math.floor(rHgt) + "px";
                row["style"]["height"] = useHgt
                for(z; z < lcLen; z++){
                    try{
                        const kid = row.children[z]
                        kid["style"]["height"] = useHgt
                    }catch(e){}
                }
                if(row && deebo.methods.rowNumbers){
                    const item = dataTableService.methods.mainData[parseInt(row.getAttribute("data-index"))]
                    if(item){
                        const indx = deebo.methods.findObjIndxInData(item, "currFilData") + 1
                        const rNum = document.getElementById("rn" + indx)
                        if(rNum)
                            rNum.style.height = useHgt
                    }
                } 
                setTimeout(deebo.methods.setRowSelChecksPlacement)
                deebo.methods.clearValidatedEdit()
            },

            replaceUniSep: function(val) {
                return (val && typeof val === "string") ? val.replace(/\Z_/g, " ") : (val ? val : null)
            },

            doSortOnClick: function(event) {
                if(event && typeof event.stopPropagation === "function")
                    event.stopPropagation()
                if(deebo.methods.isSorting)
                    return;
                try{
                    let valid = false
                    let btn;
                    let span;
                    let elIdField;
                    const reset = document.getElementById("btnReset")
                    if(event && event.target.id && event.target.nodeName === "SPAN"){
                        span = event.target
                        btn = event.target.nextElementSibling
                        if(btn)
                            btn.disabled = true
                        if(span)
                            span.style.opacity = "0.5"
                        elIdField = btn.id.replace(/btnSort/g, "")
                    } else {
                        btn = event.target.id ? event.target : event.target.parentElement
                        if(btn)
                            btn.disabled = true
                        elIdField = (event.target.id || event.target.parentElement.id).replace(/btnSort/g, "")
                    }
                    deebo.methods.isSorting = true
                    const field = deebo.methods.replaceUniSep(elIdField)
                    setTimeout( function() {
                        if(typeof Object.hasOwn !== "undefined")
                            valid = Object.hasOwn(dataTableService.methods.dataFilSrtTracker, field);
                        else
                            valid = dataTableService.methods.dataFilSrtTracker.hasOwnProperty(field);
                        if(valid){
                            dataTableService.methods.doSortOnField(field)
                            deebo.methods.renderCurrData(null, field)
                            reset.disabled = false
                            if(!dataTableService.methods.currSelRows.length && dataTableService.methods.arefilSrtTrkPropsDefault())
                                deebo.methods.resetCurrentData(null, field)
                        }
                        if(btn)
                            btn.disabled = false
                        if(span)
                            span.style.removeProperty("opacity")
                        deebo.methods.isSorting = false
                    })
                }catch(e){deebo.methods.isSorting = false}
            },

            isSorting: false,

            filterBuildUp: [],

            resetColFilter: function(event, skipFil) {
                try{event && event.stopPropagation()}catch(e){}
                const elCol = event?.target?.id.replace(/xfil/g, "")
                const field = deebo.methods.replaceUniSep(elCol)
                const fil = document.getElementById("filter" + elCol)
                const comp = document.getElementById("selectComp" + elCol)
                if(fil){
                    fil.value = "";
                    if(fil.nodeName === "SELECT" || fil.classList.contains("select-filter")){
                        comp.value = "Equals"
                        dataTableService.methods.dataFilSrtTracker[field].comparator = "Equals"
                    } else {
                        comp.value = null
                        dataTableService.methods.dataFilSrtTracker[field].comparator = null
                    }
                    if(!skipFil)
                        deebo.methods.filterOnKeyUp({ target: { id: ("filter" + elCol), value: "" } })
                    event.target.className = "hide"
                }
            },

            clickAllBtnFilXs: function() {
                const els = document.getElementsByClassName("btn-x-filter")
                const len = els.length
                for(var i = (len-1); i >= 0; i--)
                    deebo.methods.resetColFilter({ target: els[i] }, true)
            },

            filterOnKeyUp: function(event) {
                const val = event?.target?.value
                const topFilt = (event && event.target && event.target.id === "topLevelDataFilter") ? "topLevelDataFilter" : null;
                const elCol = event?.target?.id.replace(/filter/g, "")
                const field = deebo.methods.replaceUniSep(elCol)
                const btnx = document.getElementById("xfil" + elCol)
                if((field || topFilt) && !dataTableService.methods.isFiltering){
                    let manual;
                    try{ manual = Object.keys(event.target).length === 2 ? true : false }catch(e){}
                    dataTableService.methods.isFiltering = true
                    if(topFilt){
                        dataTableService.methods.easyFilter((val || ""), dataTableService.methods.mainData, dataTableService.methods.sortOrder)
                        if(!val && !dataTableService.methods.arefilSrtTrkPropsDefault()){
                            let altField = Object.keys(dataTableService.methods.mainData[0])[0]
                            dataTableService.methods.columnFilter(dataTableService.methods.mainData, altField, dataTableService.methods.dataFilSrtTracker, dataTableService.methods.sortOrder, manual)
                        }
                    } else {
                        const tl = document.getElementById("topLevelDataFilter")
                        if(tl)
                            tl.value = ""
                        dataTableService.methods.dataFilSrtTracker[field].filter = val || ""
                        dataTableService.methods.columnFilter(dataTableService.methods.mainData, field, dataTableService.methods.dataFilSrtTracker, dataTableService.methods.sortOrder, manual)
                    }
                    deebo.methods.renderCurrData(null, (topFilt || field))
                    document.getElementById("btnReset").disabled = false
                    const dct = dataTableService.methods.currFilData.length.toLocaleString(undefined, { maximumFractionDigits: 0 })
                    const tRows = document.getElementById("totalRows")
                    if(tRows){
                        tRows.textContent = dct
                        deebo.methods.handleFilSDataStr(tRows)
                    }
                    deebo.methods.setExportCount(dct)
                    setTimeout( function() { 
                        dataTableService.methods.isFiltering = false
                        const buildUpLen = deebo.methods.filterBuildUp.length
                        if(buildUpLen){
                            deebo.methods.filterOnKeyUp(deebo.methods.filterBuildUp[(buildUpLen-1)])
                            deebo.methods.filterBuildUp = []
                            if(!topFilt && (dataTableService.methods.dataFilSrtTracker[field].filter || 
                                (dataTableService.methods.dataFilSrtTracker[field].comparator && dataTableService.methods.dataFilSrtTracker[field].comparator != "Equals")
                            )){
                                if(btnx)
                                    btnx.className = "btn-x-filter"
                            } else {
                                if(btnx)
                                    btnx.className = "hide"
                            }
                        } 
                    }, 500)
                    if(!topFilt && (dataTableService.methods.dataFilSrtTracker[field].filter || 
                        (dataTableService.methods.dataFilSrtTracker[field].comparator && dataTableService.methods.dataFilSrtTracker[field].comparator != "Equals")
                    )){
                        document.getElementById("xfil" + elCol).className = "btn-x-filter"
                    } else {
                        if(btnx)
                            btnx.className = "hide"
                    }
                } else {
                    if(!deebo.methods.filterBuildUp.find( f => f.target.value === val))
                        deebo.methods.filterBuildUp.push(event)
                }
            },

            resetTblBody: function(tbody) {
                const abv = document.createElement("div")
                const blw = document.createElement("div")
                abv.id = "aboveArea"
                blw.id = "belowArea"
                tbody.appendChild(abv)
                tbody.appendChild(blw);
                deebo.methods.aboveHgt = 0
                deebo.methods.belowHgt = 0
            },

            renderCurrData: function(reset, field) {
                const tbody = document.getElementById("dataTableBody")
                const tbodyX = tbody.scrollLeft
                tbody.innerHTML = ""
                deebo.methods.resetTblBody(tbody)
                deebo.methods.horizRest = 0
                tbody.scrollTop = 0
                deebo.methods.verticalRest = 0
                let didXScrl = false;
                const thead = document.getElementById("dataTableHeaders")
                if(reset && thead)
                    thead.style.marginLeft = "0px"
                deebo.methods.clearValidatedEdit(null, true)
                document.getElementById("dataTableChecks").innerHTML = ""
                if(deebo.methods.rowNumbers)
                    try{ document.getElementById("rowNumBody").innerHTML = ""}catch(e){}
                let n = 0;
                dataTableService.methods.currMapping = {}
                const defNum = parseInt(dataTableService.methods.defltRHgt.replace(/[ ]?px/g, ""))
                const init = Math.max(deebo.methods.dTblHeight/defNum);
                const btnCharts = document.getElementById("btnCharts")
                const len = dataTableService.methods.currFilData?.length
                if(!len){//always just add 1
                    const row = document.createElement("div")
                    deebo.methods.styleEmptyFilDataRow(row, tbody, tbodyX)
                    btnCharts.disabled = true
                    const tRows = document.getElementById("totalRows")
                    if(tRows){
                        tRows.textContent = 0
                        deebo.methods.handleFilSDataStr(tRows)
                    }
                    return tbody.appendChild(row)
                }
                const colLen = deebo.methods.columnNames.length
                let hidden = []
                for(const prop in dataTableService.methods.dataFilSrtTracker){
                    if(dataTableService.methods.dataFilSrtTracker[prop].minimize)
                        hidden.push(prop)
                }
                const addCell = function(text, prop, row, indx, vis) {
                    const cell = document.createElement("div")
                    const elProp = prop?.replace(/ /g, deebo.methods.uniSep) 
                    cell.className = "data-cell"
                    cell.className += (" data-cell-" + elProp)
                    cell.tabIndex = 0
                    if(vis){
                        if(hidden.indexOf(prop) > -1)
                            cell.className += " col-header-minimized"
                        const head = document.getElementById("columnHeader" + elProp)
                        const filInp = document.getElementById("filter" + elProp)
                        const canEdit = deebo.methods.editable && !deebo.methods.shouldValidateEdit(prop, filInp);
                        const notNum = (filInp && (filInp.getAttribute("type") != "number" || /(year|yr|fy)/g.test(prop.toLocaleLowerCase()))) ? true : false
                        if(head && head.classList.contains("col-item-freeze"))
                            cell.classList.add("col-item-freeze")
                        if(filInp && filInp.getAttribute("type") === "number")
                            cell.classList.add("data-cell-riiight")
                        let useTxt; let sym;
                        cell.style.height = dataTableService.methods.defltRHgt
                        cell.style.width = dataTableService.methods.dataFilSrtTracker[prop]?.colWidth || deebo.methods.useColWid
                        if(dataTableService.methods.dataFilSrtTracker && dataTableService.methods.dataFilSrtTracker[prop]){
                            sym = dataTableService.methods.dataFilSrtTracker[prop]["colCellSymbol"]
                            useTxt = deebo.methods.figureCellText(text, notNum, dataTableService.methods.dataFilSrtTracker[prop]["colCellSymbol"])
                        } else {
                            useTxt = deebo.methods.figureCellText(text, notNum)
                        }
                        if(useTxt.prop === "textContent"){
                            cell.textContent = useTxt.value
                            if(canEdit)
                                cell.setAttribute("contenteditable", "true")
                        } else {
                            cell.innerHTML = useTxt.value
                        }
                        if(sym){
                            let symbolCls = ["$","€","£","¥","₣","₹"].indexOf(sym) > -1 ? "has-symbol-b" : "has-symbol";
                            cell.classList.add(symbolCls)
                            cell.setAttribute("data-symbol", sym)
                        }
                        // if(useTxt.ancs && useTxt.ancs.length)
                        //     setTimeout( function() { deebo.methods.giveCellAncOptions(indx, elProp, useTxt.ancs) })
                        if(window.innerWidth >= deebo.methods.mouseEventBreak){
                            cell.addEventListener("mousemove", tblDragEvents.methods.checkItemBorderCursor)
                            cell.addEventListener("mousemove", tblDragEvents.methods.handleCellSizeAdjust)
                            cell.addEventListener("mousedown", tblDragEvents.methods.handleCellSizeAdjust)
                        }
                        if(deebo.methods.editable && useTxt.prop === "textContent"){
                            cell.addEventListener("focus", deebo.methods.setCellToEdit);
                            if(canEdit)
                                cell.addEventListener("blur", deebo.methods.emitEdit);
                            cell.addEventListener("mousedown", deebo.methods.checkCellEditOnClick)
                        }
                        cell.className += " data-visible";
                    }
                    row.appendChild(cell)
                    if(row && prop && row.children.length === 1)
                        deebo.methods.createSelectRowCheck(row.getAttribute("data-index"))
                    if(field && field === prop && !didXScrl){
                        setTimeout( function() { 
                            tbody.scrollLeft = tbodyX 
                            if(thead)
                                thead.style.marginLeft = (-tbodyX + "px")
                            deebo.methods.horizRest = tbodyX
                        }, 100)
                        didXScrl = true
                    }
                }
                const limit = Math.min(init, len)
                const blw = document.getElementById("belowArea")
                let horizLim = Math.min(deebo.methods.setMaxCols(window.innerWidth), colLen)
                deebo.methods.useRowWid = deebo.methods.getAllColWidth(colLen - deebo.methods.getMiniColCount()) + "px";
                if(field && field !== "topLevelDataFilter"){
                    let room = 0
                    let offst = 3
                    const fhead = document.getElementById("columnHeader" + field.replace(/ /g, deebo.methods.uniSep))
                    if(fhead){
                        const bds = fhead.getBoundingClientRect()
                        room = dataTableService.methods.tblRight - bds.right
                        if(room > 0)
                            offst = Math.ceil(room/bds.width)
                    }
                    horizLim = Math.max(horizLim, (deebo.methods.columnNames.indexOf(field) + offst))
                }
                for(n; n < limit; n++){
                    const item = dataTableService.methods.currFilData[n]
                    const index = !reset ? deebo.methods.findObjIndxInData(item) : n
                    const row = document.createElement("div")
                    row.id = "dataTableRow" + index
                    row.className = "data-table-row"
                    row.setAttribute("data-index", index)
                    if(!dataTableService.methods.displayOnlySelRows && dataTableService.methods.currSelRows.indexOf(index) > -1)
                        row.classList.add("data-row-selected")
                    blw.insertAdjacentElement("beforebegin", row)
                    let k = 0
                    for(k; k < colLen; k++){
                        const col = deebo.methods.columnNames[k]
                        if(col)
                            addCell(item[col], col, row, index, (k <= horizLim))
                    }
                    row.style.width = deebo.methods.useRowWid
                    row.style.height = dataTableService.methods.defltRHgt
                    dataTableService.methods.currMapping[n] = index
                }
                deebo.methods.setLastRowIndex()
                deebo.methods.blockEventsInCells()
                btnCharts.disabled = false
                const tRows = document.getElementById("totalRows")
                if(tRows){
                    tRows.textContent = dataTableService.methods.currFilData.length.toLocaleString(undefined, { maximumFractionDigits: 0 })
                    deebo.methods.handleFilSDataStr(tRows)
                }
                dataTableService.methods.mapperWorkerId += 1//a reset but needs to incr so prev don't affect mapping 
                if(len){
                    if(len > init){
                        let total = 0
                        let z = deebo.methods.lastElRowIndex + 1
                        for(z; z < len; z++){
                            total += 1
                            if(reset)
                                dataTableService.methods.currMapping[z] = z
                        }
                        deebo.methods.belowHgt = total*defNum
                        blw.style.height = deebo.methods.belowHgt + "px"
                        if(!reset){
                            if (typeof Worker !== 'undefined' && deebo.methods.workerUrl !== "http://127.0.0.1:8080/worker.js") {
                                try{
                                    // Create a new
                                    let worker
                                    worker = new Worker(deebo.methods.workerUrl);
                                    worker.onmessage = function({ data }) {//{ id: data.id, map: {} }
                                        if(dataTableService.methods.mapperWorkerId === data.id)
                                            dataTableService.methods.currMapping = {...data.map}
                                    };
                                    if(worker)
                                        worker.postMessage({id: dataTableService.methods.mapperWorkerId, pk: dataTableService.methods.primaryKey,  main: dataTableService.methods.mainData, curr: dataTableService.methods.currFilData});
                                }catch(e){}
                            }
                        }
                    }
                    setTimeout( function() { 
                        deebo.methods.setRowSelChecksPlacement()
                        deebo.methods.setHoldingCheckCls()
                    })
                    setTimeout( function() { //add rows that won't render yet
                        deebo.methods.setIdealColWidth(deebo.methods.columnNames, horizLim)
                    }, 250)
                }
            },

            workerUrl: /*"http://127.0.0.1:8080/worker.js"*/"http://localhost:8080/worker.js",

            resetCurrentData: function(event, col) {
                if(!dataTableService.methods.mainData)//starts null
                    return;
                dataTableService.methods.sortOrder = []
                let i = 0;
                const arrs = document.getElementsByClassName("data-sort-arr")
                const len = arrs.length;
                for(i; i < len; i++){
                    arrs[i].innerHTML = ""
                    const iArr = document.createElement("i")
                    iArr.className = "material-icons"
                    iArr.textContent = "arrow_upward"
                    arrs[i].appendChild(iArr)
                }
                deebo.methods.clearSortInds()
                deebo.methods.clickAllBtnFilXs()
                deebo.methods.clearHiddenCols()
                deebo.methods.clearSelectedRows()
                deebo.methods.removeAllFreezeCols()
                dataTableService.methods.setTableBounds()
                dataTableService.methods.resetFilSrtTracker()
                dataTableService.methods.currFilData = dataTableService.methods.mainData?.filter( function(d) { return true })
                deebo.methods.renderCurrData(true, col)
                document.getElementById("topLevelDataFilter").value = ""
                const dct = dataTableService.methods.currFilData?.length.toLocaleString(undefined, { maximumFractionDigits: 0 })
                const tRows = document.getElementById("totalRows")
                if(tRows){
                    tRows.textContent = dct
                    deebo.methods.handleFilSDataStr(tRows)
                }
                deebo.methods.setExportCount(dct)
            },            

            getMiniColCount: function() {
                let o = 0
                for(const prop in dataTableService.methods.dataFilSrtTracker){
                    if(dataTableService.methods.dataFilSrtTracker[prop].minimize)
                        o += 1
                }
                return o
            },

            getColFrmClsList: function(el, root) {
                if(el && el.className){
                    let i = 0
                    let dc = el.className.split(" ")?.filter( function(c) { return c.startsWith(root) || deebo.methods.mystartsWith(c, root) })
                    const len = dc.length
                    const reg = new RegExp(root, "g")
                    const skip= [(root + "ceeenter"), (root + "riiight")]
                    for(i; i < len; i++){
                        if(skip.indexOf(dc[i]) < 0)
                            return dc[i].split(reg)[1]
                    }
                    return dc[0] || null
                }
            },

            minimizeColumn: function(event) {
                event && event.stopPropagation()
                const col = event.target.id ? event.target.id.replace(/(columnHeader|btnM(in|ax))/g, "") : event.target.parentElement?.id.replace(/(columnHeader|btnM(in|ax))/g, "")
                const currCol = dataTableService.methods.dataFilSrtTracker[deebo.methods.replaceUniSep(col)]
                if(col && currCol){
                    const head = document.getElementById("columnHeader" + col)
                    const cells = document.getElementsByClassName("data-cell-" + col)
                    const btnMin = document.getElementById("btnMin" + col)
                    if(!head || !cells.length)
                        return alert("Please undo a filter to return some rows before toggling column visibility.")
                    if(btnMin)
                        btnMin.disabled = true
                    if(/btnMax/g.test(event.target.id)){
                        const hidC = document.getElementsByClassName("hidden-cols")
                        if(hidC.length){
                            hidC[0].removeChild(event.target)
                            if(!hidC[0].children.length){
                                hidC[0].className = "hidden-cols"
                                hidC[0].style.removeProperty("padding")
                            }
                        }
                    }
                    if(head && cells.length){
                        const len = cells.length
                        const body = document.getElementById("dataTableBody")
                        const wid = window.innerWidth
                        const cols = deebo.methods.getAllColsAtRuntime(true)
                        const maxCols = deebo.methods.setMaxCols(wid)
                        let z = 0; let n = 0;
                        const colEls = document.getElementsByClassName("col-header")
                        const allcells = document.getElementsByClassName("data-cell")
                        const hEllen = cols.length
                        const cElLen = allcells.length
                        const normProp = deebo.methods.replaceUniSep(col)
                        if(!currCol.minimize){//hide it
                            dataTableService.methods.dataFilSrtTracker[normProp].minimize = true
                            dataTableService.methods.sortOrder = dataTableService.methods.sortOrder.filter( function(s) { return s !== normProp })
                            const el = document.getElementById("sortInd" + col)
                            if(el)
                                el.parentElement.removeChild(el)
                            const bodyW = body.getBoundingClientRect().width-16
                            const colLen = cols.length - deebo.methods.getMiniColCount()
                            deebo.methods.useColWid = Math.ceil(bodyW/Math.min(colLen, maxCols)) + "px"
                            let i = 0;
                            head.classList.add("col-header-minimized")
                            head.style.removeProperty("width")
                            for(i; i < len; i++){
                                cells[i].style.removeProperty("width")
                                cells[i].classList.add("col-header-minimized")
                            }
                            for(z; z < hEllen; z++){
                                const cEl = colEls[z]
                                if(cEl){
                                    if(cEl.id !== ("columnHeader" + col)){
                                        const prop = deebo.methods.replaceUniSep(cEl.id.replace(/columnHeader/g, ""))
                                        cEl.style.width = dataTableService.methods.dataFilSrtTracker[prop]?.colWidth || deebo.methods.useColWid;
                                    }
                                }
                            }
                            for(n; n < cElLen; n++){
                                const cEl = allcells[n]
                                if(cEl){
                                    if(!cEl.classList.contains("data-cell-" + col)){
                                        const prop = deebo.methods.replaceUniSep(deebo.methods.getColFrmClsList(cEl, "data-cell-"))
                                        cEl.style.width = dataTableService.methods.dataFilSrtTracker[prop]?.colWidth || deebo.methods.useColWid
                                    }
                                }
                            }
                            deebo.methods.addToHiddenCols(col)
                            document.getElementById("btnReset").disabled = false
                            setTimeout( function() { 
                                dataTableService.methods.setTableBounds()
                                deebo.methods.setDataRowWidthsOnMinimize(deebo.methods.getAllColWidth(colLen))
                                setTimeout( function() { 
                                    deebo.methods.setColsOnVisScreen()
                                    document.getElementById("dataTableBody").scrollBy(1, 1)
                                })
                            }, 320)
                        } else {//show it
                            dataTableService.methods.dataFilSrtTracker[normProp].minimize = null
                            const colLen = cols.length - deebo.methods.getMiniColCount()
                            deebo.methods.useColWid = Math.ceil((body.getBoundingClientRect().width-16)/Math.min(colLen, maxCols)) + "px"
                            head.classList.remove("col-header-minimized")
                            head.style.width = deebo.methods.useColWid
                            for(var i = (len-1); i >= 0; i--){
                                cells[i].classList.remove("col-header-minimized")
                                cells[i].style.width = deebo.methods.useColWid
                            }
                            let minCols = []
                            for(const prop in dataTableService.methods.dataFilSrtTracker){
                                if(dataTableService.methods.dataFilSrtTracker[prop].minimize){
                                    const useProp = prop.replace(/ /g, deebo.methods.uniSep)
                                    minCols.push("columnHeader"+useProp)
                                    minCols.push("data-cell-"+useProp)
                                }
                            } 
                            for(z; z < hEllen; z++){
                                const cEl = colEls[z]
                                if(cEl){
                                    if(minCols.indexOf(cEl.id) < 0){
                                        const prop = deebo.methods.replaceUniSep(cEl.id.replace(/columnHeader/g, ""))
                                        cEl.style.width = dataTableService.methods.dataFilSrtTracker[prop]?.colWidth || deebo.methods.useColWid;
                                    }
                                }
                            }
                            let dcminCols = minCols.filter( function(m) { return m.startsWith("data-cell-") })
                            const dcmLen = dcminCols.length
                            for(n; n < cElLen; n++){
                                const cEl = allcells[n]
                                if(cEl){
                                    let c = 0
                                    const prop = deebo.methods.replaceUniSep(deebo.methods.getColFrmClsList(cEl, "data-cell-"))
                                    if(!dcmLen)
                                        cEl.style.width = dataTableService.methods.dataFilSrtTracker[prop]?.colWidth || deebo.methods.useColWid
                                    for(c; c < dcmLen; c++){
                                        if(!cEl.classList.contains(dcminCols[c]))
                                            cEl.style.width = dataTableService.methods.dataFilSrtTracker[prop]?.colWidth || deebo.methods.useColWid
                                    }
                                }
                            }
                            
                            setTimeout( function() { 
                                dataTableService.methods.setTableBounds()
                                deebo.methods.setDataRowWidthsOnMinimize(deebo.methods.getAllColWidth(colLen))
                                document.getElementById("dataTableBody").scrollBy(1, 1)
                            }, 320)
                        }
                        deebo.methods.setHoldingCheckCls()
                    }
                    if(btnMin)
                        setTimeout( function() { btnMin.disabled = false }, 320)
                    setTimeout(deebo.methods.setColHeaderHgt)
                    setTimeout(deebo.methods.testHideMinBtn)
                }
            },

            setHoldingCheckCls: function() {
                const els = document.getElementsByClassName("holding-check")
                const len = els.length
                for(var i = (len-1); i >= 0; i--)
                    els[i].classList.remove("holding-check")
                let j = 0
                const rows = document.getElementsByClassName("data-table-row")
                const rlen = rows.length
                for(j; j < rlen; j++){
                    let o = 0
                    const kids = rows[j].children
                    const klen = kids.length
                    for(o; o < klen; o++){
                        const kid = kids[o]
                        if(/data-cell/g.test(kid.className) && !kid.classList.contains("col-header-minimized")){
                            dataTableService.methods.firstCol = deebo.methods.replaceUniSep(deebo.methods.getColFrmClsList(kid, "data-cell-"))
                            kid.classList.add("holding-check")
                            break
                        }
                    }
                }
            },

            addToHiddenCols: function(col) {
                const hC = document.getElementsByClassName("hidden-cols")
                if(hC.length){
                    const btn = document.createElement("button")
                    btn.type = "button"
                    btn.className = "btn-maximize-col"
                    btn.textContent = deebo.methods.replaceUniSep(col)
                    btn.id = "btnMax" + col
                    btn.onclick = deebo.methods.minimizeColumn
                    hC[0].appendChild(btn)
                    hC[0].style.padding = "17px 15px 5px 4px"
                }
            },

            clearHiddenCols: function() {
                const hidC = document.getElementsByClassName("hidden-cols")
                const colHs = document.querySelectorAll(".data-table-headers .col-header-minimized")
                if(hidC.length){
                    hidC[0].innerHTML = ""
                    hidC[0].className = "hidden-cols"
                    hidC[0].style.removeProperty("padding")
                }
                const cols = document.getElementsByClassName("col-header")
                const wid = window.innerWidth
                const maxCols = deebo.methods.setMaxCols(wid)
                let len = cols.length || maxCols
                deebo.methods.useColWid = Math.ceil((document.getElementById("dataTableBody").getBoundingClientRect().width-16)/Math.min(len, maxCols)) + "px"
                const cLen = colHs.length
                for(var i = (cLen-1); i >= 0; i--){
                    colHs[i].className = "col-header"
                    colHs[i].style.width = deebo.methods.useColWid
                }
                let o = 0
                len = cols.length
                for(o; o < len; o++){
                    const prop = deebo.methods.replaceUniSep(cols[o].id.replace(/columnHeader/g, ""))
                    const colWid = dataTableService.methods.dataFilSrtTracker[prop]?.["colWidth"]
                    cols[o].style.width = colWid || deebo.methods.useColWid 
                }
                deebo.methods.setColHeaderHgt()
                setTimeout(deebo.methods.setHoldingCheckCls)
            },

            clearSortInds: function() {
                const els = document.getElementsByClassName("sort-order-indicator")
                const len = els.length
                for(var i = (len-1); i >= 0; i--)
                    els[i].parentElement.removeChild(els[i])
            },

            styleEmptyFilDataRow: function(row, tbody, tbodyX, msg) {
                row.style.width = "100%"
                row.className = "data-table-row"
                row.className += " flex-center"
                row.className += " data-table-row-no-data"
                const div = document.createElement("div")
                div.className = "center"
                if(window.innerWidth < 640)
                    div.style.width = "300px"
                div.textContent = msg || "No data to display for this configuration."
                row.appendChild(div)
                row.style.whiteSpace = "normal"
                row.style.height = deebo.methods.dTblHeight + "px"
                row.style.width = document.getElementById("dataTableHeaders")?.scrollWidth + "px";
                setTimeout( function() { tbody.scrollLeft = tbodyX }, 100)
            },

            findObjIndxInData: function(item, which) {
                if(dataTableService.methods.primaryKey){
                    return dataTableService.methods[(which || "mainData")].indexOf( dataTableService.methods[(which || "mainData")].find( function(d) { 
                        return d[dataTableService.methods.primaryKey] === item[dataTableService.methods.primaryKey]
                    }) );
                }
                let i = 0; let eq = 0;
                const propLen = Object.keys(item).length
                const len = dataTableService.methods[(which || "mainData")]?.length
                for(i; i < len; i++){
                    eq = 0
                    const mD = dataTableService.methods[(which || "mainData")][i]
                    for(const prop in item){
                        if(item[prop] === mD[prop])
                            eq += 1
                        if(eq === propLen)//they all equal
                            return i
                    }
                }
                return -1
            },

            //EXPORT
            setExportCount: function(count) {
                const sp = document.querySelector(".btn-deebo-dd span")
                const ic = document.querySelector(".btn-deebo-dd i")
                if(sp && count)
                    sp.textContent = ("Export " + count + (count == "1" ? " row" : " rows"));
                if(ic)
                    ic.textContent = document.getElementsByClassName("deebo-dd-select").length ? "keyboard_arrow_up" : "keyboard_arrow_down"
            },

            toggleExportOpts: function() { 
                const cont = document.getElementById("ddSelect")
                const isOpen = cont.classList.contains("deebo-dd-select")
                if(isOpen){
                    cont.classList.remove("deebo-dd-select")
                } else {
                    cont.classList.add("deebo-dd-select")
                    setTimeout( function() {
                        const hgt = cont.getBoundingClientRect().height
                        cont.style.top = -(hgt+3) + "px"
                        window.addEventListener("click", deebo.methods.closeExportOpts)
                    })
                }
                deebo.methods.setExportCount()//toggle the up/down icon
            },

            closeExportOpts: function(e) {
                if(e && e.target && /deebo-dd-export/g.test(e.target.className)){
                } else {
                    document.getElementById("ddSelect").classList.remove("deebo-dd-select")
                    window.removeEventListener("click", deebo.methods.closeExportOpts)
                }
                deebo.methods.setExportCount()//toggle the up/down icon
            },

            handleExportData: function(event) { 
                if(!dataTableService.methods.mainData || !dataTableService.methods.mainDataLen)
                    return alert("Please generate a data grid then export data!");
                event.target.disabled = true
                try{
                    let data; let cType = "application/octet-stream";
                    const dt = new Date().getTime()
                    const format = event.target.id.replace(/btnExport(Free)?/g, "")?.toLocaleLowerCase()
                    let rows = dataTableService.methods.currFilData.filter( function(d) { return true })
                    const rLen = rows.length
                    const selLen = dataTableService.methods.currSelRows.length
                    if(selLen && (selLen !== rLen)){
                        event.target.disabled = false
                        const sStr = (selLen.toLocaleString(undefined, {maximumFractionDigits:0}) + (" row" + (selLen === 1 ? "" : "s")))
                        const rStr = (rLen.toLocaleString(undefined, {maximumFractionDigits:0}) + (" row" + (rLen === 1 ? "" : "s")))
                        const noun = (selLen === 1 ? "just that one" : "them only")
                        if(!confirm("You've selected " + sStr + " but didn't toggle to export "+noun+", so you're about to export " + rStr + ". Continue?"))
                            return
                    }
                    if(!rLen){
                        event.target.disabled = false
                        return alert("Please include some rows to export.")
                    }
                    let cols = []
                    const colsHs = document.getElementsByClassName("col-header")
                    let c = 0
                    const colLen = colsHs?.length
                    for(c; c < colLen; c++)
                        cols.push(deebo.methods.replaceUniSep(colsHs[c].id.replace(/columnHeader/g, "")))
                    let title = "MyDataTable"
                    const fName = title + dt
                    if(format === "csv"){
                        cType = "text/csv"
                        data = deebo.methods.whipToDelimForm(rows, cols, ",")
                        return deebo.methods.downloadFileExp(data, cType, fName, format, event)
                    }
                    if(format === "tsv")
                        data = deebo.methods.whipToDelimForm(rows, cols, '\t')
                    if(format === "psv")
                        data = deebo.methods.whipToDelimForm(rows, cols, '|')
                    if(data && (format === "tsv" || format === "psv"))
                        return deebo.methods.downloadFileExp(data, cType, fName, format, event)
                    if(format === "json"){
                        let n = 0
                        let i = 0
                        let useCols = []
                        const clen = cols.length
                        cType = "application/json"
                        for(n; n < clen; n++){
                            if(!dataTableService.methods.dataFilSrtTracker[cols[n]]["minimize"])
                                useCols.push(cols[n])
                        }
                        const uLen = useCols.length
                        if(!uLen){
                            event.target.disabled = false
                            return alert("Please select or unhide some columns to export.")
                        }
                        if(uLen === clen){//nothing hidden just strinify
                            data = JSON.stringify(rows)
                        } else {//we know we have objs by now
                            let json = []
                            for(i; i < rLen; i++){
                                const row = rows[i]
                                if(row && typeof row === "object"){
                                    let exp = {}
                                    for(const prop in row){
                                        if(useCols.indexOf(prop) > -1)
                                            exp[prop] = row[prop]
                                    }
                                    json.push(exp)
                                } else {
                                    json.push(row)
                                }
                            }
                            data = JSON.stringify(json)
                        }
                        if(data)
                            deebo.methods.downloadFileExp(data, cType, fName, format, event)
                    }
                }catch(e){ event.target.disabled = false }
            },

            downloadFileExp: function(data, cType, fName, format, event) {
                const blob = new Blob([data], {type: cType})
                const url = URL.createObjectURL(blob)
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", (fName + "." + format));
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url)
                if(event && event.target)
                    event.target.disabled = false
            },

            whipToDelimForm: function(rows, cols, delim) {
                let text = ""
                let i = 0; let n =0; let o = 0;
                const len = rows.length
                let useCols = []
                const clen = cols.length
                for(n; n < clen; n++){
                    if(!dataTableService.methods.dataFilSrtTracker[cols[n]]["minimize"])
                        useCols.push(cols[n])
                }
                const ulen = useCols.length
                for(o; o < ulen; o++)
                    text += (useCols[o].replace(/[,\|]/g, "") + (o < (ulen-1) ? delim : ""));//just remove commas in a col header
                if(!text)
                    return alert("Please select or unhide some columns to export.")
                text += '\n'
                for(i; i < len; i++){
                    const row = rows[i]
                    if(typeof row === "object"){
                        let z = 0
                        for(const prop in row){
                            if(dataTableService.methods.dataFilSrtTracker[prop]["minimize"])
                                continue
                            const val = row[prop]
                            if(val && typeof val === "string"){
                                if((delim === "," && /,/g.test(val)) || (delim === "|" && /\|/g.test(val)))
                                    text += ('"' + val + '"' + (z < (ulen-1) ? delim : ""))
                                else
                                    text += ((val || "null") + (z < (ulen-1) ? delim : ""))
                            } else
                                text += ((val || "null") + (z < (ulen-1) ? delim : ""))
                            z += 1
                        }
                    } else {
                        if(row && typeof row === "string"){
                            if((delim === "," && /,/g.test(row)) || (delim === "|" && /\|/g.test(row)))
                                text += ('"' + row + '"')
                            else
                                text += (row || "null")
                        } else
                            text += (row || "null")
                    }
                    if(i < (len-1))
                        text += '\n'
                }
                return text
            },
            //EXPORT

            //INSIGHTS
            displaySelectedInsights: function(e) {
                const here = document.getElementsByClassName("selected-row-insights")
                if(here.length)
                    return deebo.methods.clearSelInsights()
                const tbl = document.getElementById("dataTableBody")
                if(tbl)
                    tbl.style.overflow = "hidden"
                const el = document.getElementById("selectedRowsInsights")
                const cols = deebo.methods.getAllColsAtRuntime(true, true);
                if(deebo.methods.rowNumbers){
                    document.getElementsByClassName("row-numbers")[0].classList.add("hide")
                    document.getElementById("dataTable").className = "data-table"
                }
                if(dataTableService.methods.currSelRows.length){
                    const selData = dataTableService.methods.mainData.filter( function(d, ind) { return dataTableService.methods.currSelRows.indexOf(ind) > -1 })
                    if(!selData || !selData.length)
                        return alert("No data to display for this configuration.");
                    deebo.methods.getDataInsights(selData, cols, "selectedRowsInsights", "selected")
                } else {
                    const filData = dataTableService.methods.currFilData.filter( function(d, ind) { return true })
                    if(!filData || !filData.length)
                        return alert("No data to display for this configuration.");
                    const pre = dataTableService.methods.currFilData.length === dataTableService.methods.mainDataLen ? "" : "filtered"
                    deebo.methods.getDataInsights(filData, cols, "selectedRowsInsights", pre)
                }
                if(tbl && el){
                    const hdrBds = document.getElementById("dataTableHeaders").getBoundingClientRect()
                    const tblbds = tbl.getBoundingClientRect()
                    const flTop = Math.floor(hdrBds.top)
                    el.className = "selected-row-insights"
                    el.style.top = flTop + "px";
                    setTimeout( function() { el.className += " selected-row-insights-show" }, 250)
                    let tblH = 500;
                    const nmHgt= parseInt(deebo.methods.dTblHeight.toString())
                    if(!isNaN(nmHgt))
                        tblH = nmHgt;
                    const elHt = Math.floor(hdrBds.height+tblH)
                    el.style.height = elHt + "px"
                    el.style.left = Math.floor(tblbds.left) + "px"
                    el.style.right = "0";
                    const scrC = document.getElementsByClassName("sel-ins-scrl-cont")[0]
                    const sH2 = document.querySelector(".selected-row-insights h2")
                    if(scrC && sH2)
                        scrC.style.height = (elHt-sH2.getBoundingClientRect().height-52) + "px";
                    deebo.methods.showCharts = true
                    deebo.methods.clearValidatedEdit(null, true)
                    deebo.methods.toggleTopControls(true)
                    window.addEventListener("scroll", deebo.methods.keepSelInsightsOnRows)
                }
            },

            toggleTopControls: function(disable) {
                document.getElementById("btnCharts").disabled = disable
                document.getElementById("btnReset").disabled = disable
                document.getElementById("topLevelDataFilter").disabled = disable
            },

            clearSelInsights: function() {
                const ins = document.getElementsByClassName("selected-row-insights")
                const len = ins.length
                for(var i = (len-1); i >= 0; i--){
                    try{
                        const el = ins[i]
                        el.innerHTML = ""
                        el.className = "hide"
                        el.removeAttribute("style")
                    }catch(e){}
                }
                if(deebo.methods.rowNumbers){
                    document.getElementsByClassName("row-numbers")[0].className = "row-numbers"
                    document.getElementById("dataTable").classList.add("inline-table")
                }
                deebo.methods.showCharts = false
                deebo.methods.toggleTopControls(false)
                const dtb = document.getElementById("dataTableBody")
                dtb.style.removeProperty("overflow")
                dtb.scrollBy(1, 1)
                deebo.methods.numCols = []
                deebo.methods.waitingInsightGraphs = {};
                try{ window.removeEventListener("scroll", deebo.methods.keepSelInsightsOnRows) }catch(e){}
            },

            keepSelInsightsOnRows: function(){
                window.requestAnimationFrame( function() {
                    const div = document.getElementsByClassName("selected-row-insights")[0]
                    if(div){
                        try{
                            const el = document.getElementById("dataTableHeaders")
                            const tblbds = el.getBoundingClientRect()
                            div.style.top = Math.floor(tblbds.top) + "px"
                        }catch(e){}
                    }
                })
            },

            makeCloseSelInsightsBtn: function(h2) {
                const ix = document.createElement("i")
                const btnx = document.createElement("button")
                btnx.type = "button"
                btnx.className = "no-btn"
                btnx.style.float = "right"
                ix.className = "material-icons"
                ix.className += " error-message"
                ix.className += " heavy"
                ix.textContent = "close"
                btnx.appendChild(ix)
                btnx.onclick = deebo.methods.clearSelInsights
                h2.insertAdjacentElement("afterbegin", btnx)
            },

            getCurrentInsightData: function() {
                if(dataTableService.methods.currSelRows.length){
                    return dataTableService.methods.mainData.filter( function(d, ind) { return dataTableService.methods.currSelRows.indexOf(ind) > -1 })
                } else {
                    return dataTableService.methods.currFilData.filter( function(d) { return true })
                }
            },

            monitorInsightScrl: function() {
                let b = 0; let i = 0
                const bgs = deebo.methods.waitingInsightGraphs["barGraphs"]
                const lgs = deebo.methods.waitingInsightGraphs["lineGraphs"]
                const blen = bgs?.length
                const len = lgs?.length
                const valData = deebo.methods.getCurrentInsightData()
                for(b; b < blen; b++){//{ useId: useId, strCol: strCol, numCol: numCol, inner: inner }
                    const bg = bgs[b]
                    const bel = document.getElementById(bg.useId)
                    const exts = document.querySelector("#" + bg.useId + " .inner-bg-contain")
                    if(bel && !exts && !bg.showing && deebo.methods.topIsInView(bg.useId)){
                        bg["showing"] = true
                        const bgData = valData.filter( function(d) { return d[bg.numCol] === 0 || !!d[bg.numCol] }).
                        map( function(d) { return ({strColumn: (d[bg.strCol] || "N/A"), numColumn: d[bg.numCol]})} );
                        setTimeout( function() { 
                            deebo.methods.buildBarGraphWithTwoCols(bg.strCol, bg.numCol, bgData, bg.inner, bg.useId, "avg");
                            deebo.methods.waitingInsightGraphs["barGraphs"] = deebo.methods.waitingInsightGraphs["barGraphs"].filter( function(bgp) { return bgp.useId !== bg.useId }) 
                        })
                    }
                }
                for(i; i < len; i++){//{ useId: parId, col: col, ncol: useNCol }, can have "data" property
                    const lg = lgs[i]
                    const lel = document.getElementById(lg.useId)
                    const grphCont = document.querySelector("#" + lg.useId + " .inner-bg-contain")//already added
                    const isLoading = document.querySelector("#" + lg.useId + " .inner-bg-contain .lg-loading")
                    if(lel && isLoading && !lg.showing && deebo.methods.topIsInView(lg.useId)){
                        let uDates = []
                        let mappedData = []
                        lg["showing"] = true
                        if(lg.data && lg.uDates){
                            //mappedData and uDates already set
                        } else {
                            const dSet = new Set(valData.sort( function(a, b) {return a[lg.col] > b[lg.col] ? 1 : -1} ).
                            map( function(d) {return JSON.stringify(d[lg.col])} ))//unique dates
                            dSet.forEach( function(v) { 
                                const pdt = JSON.parse(v)
                                if(typeof pdt === "string")
                                    uDates.push(deebo.methods.coerceDate(pdt)) 
                                else
                                    uDates.push(pdt)
                            });
                            mappedData = valData.filter( function(d) {return d[lg.ncol] === 0 || !!d[lg.ncol]}).
                            map( function(d) {return ({numColumn: d[lg.ncol], dtColumn: d[lg.col]})})
                        }
                        if (typeof Worker !== 'undefined'/* && deebo.methods.workerUrl !== "http://127.0.0.1:8080/worker.js"*/) {
                            try{
                                let worker
                                worker = new Worker(deebo.methods.workerUrl);
                                worker.onmessage = function({ data }) {//{ lineGraph: data.lineGraph, data: [] }
                                    if(grphCont.id === data.lineGraph && document.getElementsByClassName("insight-field-row").length){
                                        setTimeout( function() { 
                                            deebo.methods.drawLineGraph(null, grphCont, "dtColumn", lg.col, "numColumn", lg.ncol, data.data, data.data.length);
                                            deebo.methods.waitingInsightGraphs["lineGraphs"] = deebo.methods.waitingInsightGraphs["lineGraphs"].filter( function(lgp) { return lgp.useId !== lg.useId })
                                        })
                                    }
                                };
                                if(worker)
                                    worker.postMessage({ lineGraph: grphCont.id, data: (lg.data || mappedData), uDates: (lg.uDates || uDates), stat: "avg" });
                            }catch(e){
                                const useData = deebo.methods.setUseableLgData((lg.data || mappedData), (lg.uDates || uDates), "avg")
                                setTimeout( function() { 
                                    deebo.methods.drawLineGraph(null, grphCont, "dtColumn", lg.col, "numColumn", lg.ncol, useData, useData.length) 
                                    deebo.methods.waitingInsightGraphs["lineGraphs"] = deebo.methods.waitingInsightGraphs["lineGraphs"].filter( function(lgp) { return lgp.useId !== lg.useId })
                                })
                            }
                        } else {
                            const useData = deebo.methods.setUseableLgData((lg.data || mappedData), (lg.uDates || uDates), "avg")
                            setTimeout( function() { 
                                deebo.methods.drawLineGraph(null, grphCont, "dtColumn", lg.col, "numColumn", lg.ncol, useData, useData.length) 
                                deebo.methods.waitingInsightGraphs["lineGraphs"] = deebo.methods.waitingInsightGraphs["lineGraphs"].filter( function(lgp) { return lgp.useId !== lg.useId })
                            })
                        }
                    }
                }
            },

            numCols: [],

            getDataInsights: function(data, cols, parentId, selOrFil) {
                let i = 0; let r =0; let o = 0;
                let pieCharts = []
                let dtCols = [];
                let okBarGraphs = []
                let okLineGraphs = []
                let useableCols = []
                let hasNoData = []
                cols = cols.filter( function(c) { return !deebo.methods.idCol(c) })
                let len = cols.length
                const dLen = data.length
                const wid = document.getElementById("dataTableBody").getBoundingClientRect().width//window.innerWidth
                const insightCols = wid < 1024 ? 2 : 3
                const forSelRows = selOrFil ? true : false;
                const el = document.getElementById((parentId || "insights"))
                if(len){
                    el.className = "insights"
                    const h2 = document.createElement("h2")
                    const adj = ((forSelRows ? (" <span>"+(selOrFil || "selected")+"</span> row") : " total row") + (dLen === 1 ? "" : "s"))
                    h2.innerHTML = "Data Insights " + ("for <b>" + (dLen).toLocaleString(undefined, {maximumFractionDigits:0}) + "</b>" + adj)
                    if(forSelRows && selOrFil === "filtered"){
                        const filInf = deebo.methods.getAllFilSrtInfo()?.replace(/Filtered By:/g, "filtered by").
                        replace(/ \&bull; Sorted By/g, ", Sorted By").replace(/ \&bull; /g, " ")
                        h2.innerHTML = ("Data Insights " + ("for <b>" + (dLen).toLocaleString(undefined, {maximumFractionDigits:0}) + 
                                       "</b> row" + (dLen === 1 ? " " : "s ")) + filInf?.split(", Sorted By")[0].trim())
                    }
                    h2.className = "center"
                    deebo.methods.makeCloseSelInsightsBtn(h2)
                    el.appendChild(h2)
                } else {
                    el.className = "insights"
                    const h2 = document.createElement("h2")
                    h2.className = "center"
                    h2.textContent = "Not enough data to display insights for"
                    deebo.methods.makeCloseSelInsightsBtn(h2)
                    return el.appendChild(h2)
                }
                for(o; o < len; o++){
                    const col = cols[o]
                    const colData = data.map( function(d) { return d[col] })
                    if(colData.every( function(d) { return !d })){
                        hasNoData.push(col);
                        continue;
                    }
                    const yearCol = /(year|yr|fy)/g.test(col?.toLocaleLowerCase())
                    const allNumData = colData.every( function(d) { return !d || (d && typeof d === "number") })
                    const dateData = (colData.every( function(d) { return !d || deebo.methods.isADateObject(d) }) && !colData.every( function(d) { return !d }))
                    let bitData;
                    if(allNumData)
                        bitData = colData.every( function(d) { return !d || d === 1 || d === 0 })
                    if(allNumData && !yearCol && !bitData)//num data
                        deebo.methods.numCols.push(col);
                    if(dateData || yearCol)
                        dtCols.push(col)
                }
                const nclen = deebo.methods.numCols.length
                if(nclen){//if any num cols, see if you can do a bar graph
                    for(const prop in dataTableService.methods.dataFilSrtTracker){
                        const trkr = dataTableService.methods.dataFilSrtTracker[prop]
                        if(trkr && trkr.selDDVals && trkr.selDDVals.length){
                            okBarGraphs.push(prop)
                            if(dtCols.length)
                                okLineGraphs.push(prop)
                        }
                    }
                    let c= 0; let x = 0
                    for(c; c < len; c++){
                        const useC = cols[c]
                        useableCols.push(useC)
                        if(okBarGraphs.indexOf(useC) > -1){
                            for(x; x < nclen; x++)
                                useableCols.push(useC + dataTableService.methods.bgSep + deebo.methods.numCols[x])
                            x = 0;
                        }
                        if(okLineGraphs.indexOf(useC) > -1){
                            o = 0; let d = 0;
                            const dtlen = dtCols.length
                            for(o; o < nclen; o++){
                                for(d; d < dtlen; d++)
                                    useableCols.push(useC + dataTableService.methods.bgSep + deebo.methods.numCols[o] + dataTableService.methods.bgSep + dtCols[d])
                                d = 0;
                            }
                            o = 0;
                        }
                    }
                } else { useableCols = cols.filter( function(c) { return c }) }
                len = useableCols.length
                const scrlCont = document.createElement("div")
                scrlCont.className = "sel-ins-scrl-cont"
                const rLen = Math.ceil(len/insightCols)
                for(r; r < rLen; r++){
                    const rdiv = document.createElement("div")
                    rdiv.className = "insight-field-row";
                    scrlCont.appendChild(rdiv)
                }
                setTimeout( function() { scrlCont.addEventListener("scroll", deebo.methods.monitorInsightScrl) })
                el.appendChild(scrlCont)
                for(i; i < len; i++){
                    try{
                        const col = useableCols[i]
                        const elIdCol = col.replace(/ /g, deebo.methods.uniSep)
                        const colData = data.map( function(d) { return d[col] })
                        if(hasNoData.indexOf(col) > -1)
                            continue;
                        let whichRow = document.getElementsByClassName("insight-field-row")[Math.floor(i/insightCols)]
                        if(forSelRows)
                            whichRow = document.querySelectorAll("#" + parentId + " .insight-field-row")[Math.floor(i/insightCols)]
                        if(whichRow && whichRow.previousElementSibling && whichRow.previousElementSibling.classList.contains("insight-field-row") && 
                            whichRow.previousElementSibling.children.length < insightCols){
                                whichRow = whichRow.previousElementSibling
                        }
                        const div = document.createElement("div")
                        const inner = document.createElement("div")
                        const name = document.createElement("h3")
                        const useId = ((selOrFil || "") + "insField" + elIdCol)
                        if(document.getElementById(useId))
                            continue
                        div.id = useId
                        div.className = "insight-field"
                        if(wid >= 760)
                            inner.style.width = "85%"
                        inner.style.paddingTop = "0"
                        name.className = "lg-text"
                        name.classList.add("semi-heavy")
                        name.style.marginBottom = "9px"
                        inner.appendChild(name)
                        div.appendChild(inner)
                        whichRow.appendChild(div)
                        const reg = new RegExp(dataTableService.methods.bgSep, "g")
                        if(reg.test(col)){
                            const bgCols = col.split(dataTableService.methods.bgSep)
                            const strCol = bgCols[0]
                            const numCol = bgCols[1]
                            let dtCol
                            if(bgCols.length === 3)//line graph
                                dtCol = bgCols[2]
                            name.classList.add("center")
                            if(!dtCol){//bar graph
                                name.textContent = "Avg " + deebo.methods.titleCase(numCol) + " by " + deebo.methods.titleCase(strCol);
                                if((i+1) <= insightCols || deebo.methods.topIsInView(useId)){
                                    const bgData = data.filter( function(d) { return d[numCol] === 0 || !!d[numCol] }).
                                    map( function(d) { return ({strColumn: (d[strCol] || "N/A"), numColumn: d[numCol]})} );
                                    setTimeout( function() { deebo.methods.buildBarGraphWithTwoCols(strCol, numCol, bgData, inner, useId, "avg"); })
                                } else {
                                    const bgs = deebo.methods.waitingInsightGraphs["barGraphs"]
                                    const bgneeds = { useId: useId, strCol: strCol, numCol: numCol, inner: inner }
                                    if(!bgs || typeof bgs === "undefined"){
                                        deebo.methods.waitingInsightGraphs["barGraphs"] = []
                                        deebo.methods.waitingInsightGraphs["barGraphs"].push(bgneeds)
                                    } else {
                                        bgs.push(bgneeds)
                                    }
                                }
                            } else {//line graph
                                let uDates = []
                                name.textContent = "Avg " + deebo.methods.titleCase(numCol) + " by " + deebo.methods.titleCase(dtCol);
                                const dSet = new Set(data.sort( function(a, b) {return a[dtCol] > b[dtCol] ? 1 : -1} ).
                                map( function(d) {return JSON.stringify(d[dtCol])} ))//unique dates
                                dSet.forEach( function(v) { 
                                    const pdt = JSON.parse(v)
                                    if(typeof pdt === "string")
                                        uDates.push(deebo.methods.coerceDate(pdt)) 
                                    else
                                        uDates.push(pdt)
                                });
                                const mappedData = data.filter( function(d) {return d[numCol] === 0 || !!d[numCol]}).
                                map( function(d) {return ({strColumn: (d[strCol] || "N/A"), numColumn: d[numCol], dtColumn: d[dtCol]})})
                                setTimeout( function() { deebo.methods.buildLg(useId, mappedData, col, numCol, selOrFil, col.replace(/ /g, deebo.methods.uniSep), uDates) })
                            }
                            continue
                        }
                        name.textContent = deebo.methods.sanitizeUi(deebo.methods.titleCase(col))
                        let mdiv
                        const yearCol = /(year|yr|fy)/g.test(col?.toLocaleLowerCase())
                        const allNumData = colData.every( function(d) { return !d || (d && typeof d === "number") })
                        const boolData = colData.every( function(d) { return !d || (d && typeof d === "boolean") })
                        const counts = deebo.methods.getColumnValueCounts(colData)//build select dds and pie graphs with this
                        const mode = deebo.methods.getColumnMode(counts)
                        const disr = (counts["n_a"] && counts["n_a"] >= mode.amount) ? " (non-empty value)" : ""
                        if(mode && mode.amount != 1 && dtCols.indexOf(col) < 0){
                            try{
                                let maxChars = 75
                                let pMdTxt = deebo.methods.sanitizeUi(mode.text)
                                mdiv = document.createElement("div")
                                if(mode.text && typeof mode.text === "string"){
                                    pMdTxt = mode.text.substring(0, maxChars)
                                    if(pMdTxt.length === maxChars){
                                        try{
                                            pMdTxt = (pMdTxt.trim() + "...")
                                            if(pMdTxt.startsWith("\""))
                                                pMdTxt += "\""
                                            if(pMdTxt.startsWith("'"))
                                                pMdTxt += "'"
                                        }catch(e){}
                                    }
                                }
                                if(pMdTxt && allNumData && !yearCol)
                                    pMdTxt = parseInt(pMdTxt).toLocaleString(undefined, { maximumFractionDigits: 3 })
                                const modeVal = mode.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                mdiv.innerHTML = "Most frequent"+disr+": <i>" + pMdTxt + "</i> appears " + modeVal + " time" + (mode.amount === 1 ? "" : "s");
                            }catch(e){}
                        }
                        let bitData;
                        if(allNumData)
                            bitData = colData.every( function(d) { return !d || d === 1 || d === 0 })
                        if(allNumData && !yearCol && !bitData){//num data
                            let isCurr = false
                            const sym = dataTableService.methods.dataFilSrtTracker[col]?.colCellSymbol
                            let symCls
                            const sdiv = document.createElement("div")
                            const adiv = document.createElement("div")
                            const mindiv = document.createElement("div")
                            const maxdiv = document.createElement("div")
                            sdiv.className = "half-wid";
                            adiv.className = "half-wid";
                            mindiv.className = "half-wid";
                            maxdiv.className = "half-wid";
                            if(sym){
                                isCurr = ["$","€","£","¥","₣","₹"].indexOf(sym) > -1
                                symCls = isCurr ? "has-symbol-b" : "has-symbol"
                            }
                            let tdiv
                            const numsOnly = colData.filter( function(d) { return !!d || (d === 0) })
                            let noLen = numsOnly.length
                            let sum = numsOnly.reduce( function(acc, curr) { return acc + curr }, 0)
                            const lastNum = numsOnly[numsOnly.length-1]
                            if(typeof lastNum === "number" && ((sum - lastNum === lastNum) || (Math.abs(sum - lastNum*2) < 0.02))){//check that a total column is already there
                                sum -= lastNum
                                noLen -= 1
                                tdiv = document.createElement("div")
                                tdiv.textContent = "We omitted the last value from the total because it may be a total row itself."
                            }
                            sdiv.id = "sum" + (selOrFil || "") + elIdCol
                            adiv.id = "avg" + (selOrFil || "") + elIdCol
                            const useAvg = (sum/noLen)
                            sdiv.innerHTML = ('<span>Total: </span><span class="lg-text">' + sum.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: (isCurr ? 2 : 0) }) + "</span>");
                            adiv.innerHTML = ('<span>Avg: </span><span class="lg-text">' + useAvg.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: (isCurr ? 2 : 0) }) + "</span>");
                            inner.appendChild(sdiv)
                            inner.appendChild(adiv)
                            try{
                                mindiv.id = "min" + (selOrFil || "") + elIdCol
                                maxdiv.id = "max" + (selOrFil || "") + elIdCol
                                mindiv.innerHTML = '<span>Min: </span><span class="lg-text">' + Math.min(...numsOnly).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: (isCurr ? 2 : 0) }) + "</span>";
                                maxdiv.innerHTML = '<span>Max: </span><span class="lg-text">' + Math.max(...(tdiv ? numsOnly.filter( function(n, ind) { return ind < (numsOnly.length-1) }) : numsOnly)).
                                toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: (isCurr ? 2 : 0) }) + "</span>";
                                inner.appendChild(mindiv)
                                inner.appendChild(maxdiv)
                            }catch(e){}
                            if(mdiv)
                                inner.appendChild(mdiv)
                            if(tdiv)
                                inner.appendChild(tdiv)
                            if(sym && symCls){
                                if(sdiv && sdiv.lastElementChild && sdiv.lastElementChild.textContent && /[0-9]+/g.test(sdiv.lastElementChild.textContent)){
                                    sdiv.lastElementChild.setAttribute("data-symbol", sym)
                                    sdiv.lastElementChild.classList.add(symCls);
                                }
                                if(adiv && adiv.lastElementChild && adiv.lastElementChild.textContent && /[0-9]+/g.test(adiv.lastElementChild.textContent)){
                                    adiv.lastElementChild.setAttribute("data-symbol", sym)
                                    adiv.lastElementChild.classList.add(symCls);
                                }
                                if(mindiv && mindiv.lastElementChild && mindiv.lastElementChild.textContent && /[0-9]+/g.test(mindiv.lastElementChild.textContent)){
                                    mindiv.lastElementChild.setAttribute("data-symbol", sym)
                                    mindiv.lastElementChild.classList.add(symCls);
                                }
                                if(maxdiv && maxdiv.lastElementChild && maxdiv.lastElementChild.textContent && /[0-9]+/g.test(maxdiv.lastElementChild.textContent)){
                                    maxdiv.lastElementChild.setAttribute("data-symbol", sym)
                                    maxdiv.lastElementChild.classList.add(symCls);
                                }
                            }
                            if(noLen && noLen < 5000){
                                try{
                                    const vdhtitle = document.createElement("div")
                                    vdhtitle.textContent = "Building " + deebo.methods.sanitizeUi(deebo.methods.titleCase(col)) + " value distribution..."
                                    vdhtitle.className = "center"
                                    vdhtitle.style.padding = "33px 0px 17px 0px";
                                    vdhtitle.style.textDecoration = "underline";
                                    inner.appendChild(vdhtitle)
                                    let useData
                                    if(tdiv && lastNum)
                                        useData = numsOnly.filter( function(d) { return d !== lastNum })
                                    const frag = document.createDocumentFragment()
                                    frag.appendChild(deebo.methods.showNumColValDist(selOrFil, elIdCol, (useData || numsOnly), vdhtitle, useAvg, sym, symCls))
                                    if(frag.children.item(0).nodeName === "SPAN"){
                                        inner.removeChild(vdhtitle)
                                    } else {
                                        inner.appendChild(frag)
                                    }
                                }catch(e){}
                            }
                        } else {
                            const dSet =new Set(colData)
                            let arrFrmSet = []
                            dSet.forEach( function(v) { arrFrmSet.push(v) })
                            if(dtCols.indexOf(col) < 0){
                                const udiv = document.createElement("div")
                                const ndiv = document.createElement("div")
                                udiv.innerHTML = arrFrmSet.length.toLocaleString(undefined, { maximumFractionDigits: 0 }) + " unique value" + (dSet.size === 1 ? "" : "s")
                                const empVals = colData.filter( function(d) { return !d }).length
                                ndiv.textContent = empVals.toLocaleString(undefined, { maximumFractionDigits: 0 }) + " empty value" + (empVals === 1 ? "" : "s");
                                inner.appendChild(udiv)
                                inner.appendChild(ndiv)
                                if(mdiv)
                                    inner.appendChild(mdiv)
                            }
                            if(((boolData || bitData) || (arrFrmSet.filter( function(a) { return !!a }).length > 0 && colData.every( function(d) { return !d || typeof d === "string" })))){
                                if(arrFrmSet.length <= 18)
                                    pieCharts.push({ inner: inner, counts: counts, type: ((boolData || bitData) ? "boolean" : "string") })
                            }
                        }
                    }catch(e){}
                }
                
                if(len){
                    //end rows evenly
                    if(wid >= 760){
                        let n = 0;
                        let ifds = document.getElementsByClassName("insight-field")
                        const mod = ifds.length%insightCols
                        const addLen = insightCols-mod
                        const rows = document.getElementsByClassName("insight-field-row")
                        const lastRow = rows[(rows.length)-1]
                        // if(!lastRow.children.length)
                        //     return el.removeChild(lastRow)
                        if(lastRow && addLen !== insightCols){
                            for(n; n < addLen; n++){
                                const div = document.createElement("div")
                                div.className = "insight-field"
                                div.style.color = "white"
                                div.style.textAlign = "center"
                                div.textContent = "A"
                                lastRow.appendChild(div)
                            }
                        }
                    }
                }
                setTimeout( function() {
                    let p = 0
                    const pLen = pieCharts.length
                    for(p; p < pLen; p++)
                        deebo.methods.buildPieGraphFromColVals(pieCharts[p].inner, pieCharts[p].counts, pieCharts[p].type)
                    setTimeout(deebo.methods.cleanUpPieLayovers)
                }, 50)
                if(dtCols.length && deebo.methods.numCols.length && typeof document.querySelectorAll === "function")
                    deebo.methods.buildLineGraphs(dtCols, deebo.methods.numCols, data, selOrFil, "avg")
            },

            getColumnValueCounts: function(data) {
                let i = 0
                let count = {}
                const na = "n_a"
                const len = data.length
                for(i; i < len; i++){
                    const d = data[i]
                    const val = (d && typeof d) === "string" ? d : 
                    (deebo.methods.isADateObject(d) ? d.toLocaleDateString() : d)
                    if(!val || typeof val === "undefined" || deebo.methods.badStrings.indexOf(val) > -1){
                        if(!count[na] || typeof count[na] === "undefined")
                            count[na] = 1
                        else
                            count[na] += 1
                        continue
                    }
                    if(!count[val] || typeof count[val] === "undefined")
                        count[val] = 1
                    else
                        count[val] += 1
                }
                count[deebo.methods.deboTotal] = len
                return count;
            },

            getColumnMode: function(count) {
                let most = null
                const na = "n_a"
                for(const prop in count){
                    if(prop === deebo.methods.deboTotal || prop === na)
                        continue
                    if(!most)
                        most = {text: prop, amount: count[prop]}
                    if(count[prop] > most.amount)
                        most = {text: prop, amount: count[prop]}
                }
                return most
            },

            maxBarWid: 90,

            //bar graph
            buildBarGraphWithTwoCols: function(strCol, numCol, bgData, div, parId, stat) {
                let statData = []
                let xlbls = []
                const vals = dataTableService.methods.dataFilSrtTracker[strCol]?.selDDVals.filter( function(g) {return g.value !== "(Select All)"})
                const vlen = vals.length
                let statBC;
                const icont = document.createElement("div")
                const barY = document.createElement("div")
                const barXC = document.createElement("div")
                const barCt = document.createElement("div")
                const xlbl = document.createElement("div")
                statBC = document.createElement("div")
                statBC.className = "flex-center"
                statBC.className += " stat-opt-contain";
                let s = 0
                const slen = deebo.methods.statOpts.length
                for(s; s < slen; s++){
                    const sstat = deebo.methods.statOpts[s]
                    const sdiv = document.createElement("div")
                    const sbtn = document.createElement("button")
                    sdiv.className = "flex-item";
                    sbtn.className = "no-btn"
                    sbtn.className += " stat-opt-btn";
                    sbtn.id = parId + "btn__" + sstat//critical to refresh bar graphs
                    if(sstat === stat)//initial
                        sbtn.classList.add("stat-opt-btn-active")
                    sbtn.onclick = deebo.methods.handleStatChange
                    sbtn.textContent = deebo.methods.titleCase(sstat)
                    sdiv.appendChild(sbtn)
                    statBC.appendChild(sdiv)
                }
                icont.className = "inner-bg-contain"
                barXC.className = "bar-graph-x-cols"
                barY.className = "bar-graph-y-cols"
                barCt.className = "bar-graph-real-vals"
                icont.appendChild(barY)
                icont.appendChild(barCt)
                icont.appendChild(barXC)
                if(statBC)
                    div.appendChild(statBC)
                div.appendChild(icont)
                div.appendChild(xlbl)
                const makeXLbl = function(val) {
                    const xlbl = document.createElement("div")
                    xlbl.className = "bg-ind-var"
                    xlbl.className += " center";
                    xlbl.textContent = val
                    xlbl.onmouseenter = deebo.methods.barGLblMouseIn
                    xlbl.onmouseleave = deebo.methods.barGLblMouseOut
                    barXC.appendChild(xlbl)
                    xlbls.push(val)
                }
                let o = 0
                for(o; o < vlen; o++){
                    const val = vals[o].value
                    const justVal = bgData.filter( function(d) {return d["strColumn"] === val}).map( function(d) {return d["numColumn"]} )
                    const jvlen = justVal.length
                    if(jvlen){
                        let statobj = { x: val, y: 0 }
                        if(stat === "avg")
                            statobj.y = (justVal.reduce( function(acc, curr) {return (acc += curr)} , 0)/jvlen)
                        if(stat === "min")
                            statobj.y = Math.min(...justVal)
                        if(stat === "max")
                            statobj.y = Math.max(...justVal)
                        if(stat === "sum")
                            statobj.y = (justVal.reduce( function(acc, curr) {return (acc += curr)} , 0))
                        if(stat === "median")
                            statobj.y = deebo.methods.findDataMedian(justVal, jvlen)
                        if(stat === "mode")
                            statobj.y = deebo.methods.findDataMode(justVal, jvlen)
                        statData.push(statobj)
                        makeXLbl(val)
                    }
                }
                const justNull = bgData.filter( function(d) { return d["strColumn"] === "N/A"}).map( function(d) {return d["numColumn"]} )
                const jlen = justNull.length
                if(jlen){
                    let nstatobj = { x: "N/A", y: 0 }
                    if(stat === "avg")
                        nstatobj.y = (justNull.reduce( function(acc, curr) {return (acc += curr)} , 0)/jlen)
                    if(stat === "min")
                        nstatobj.y = Math.min(...justNull)
                    if(stat === "max")
                        nstatobj.y = Math.max(...justNull)
                    if(stat === "sum")
                        nstatobj.y = (justNull.reduce( function(acc, curr) {return (acc += curr)} , 0))
                    if(stat === "median")
                        nstatobj.y = deebo.methods.findDataMedian(justNull, jlen)
                    if(stat === "mode")
                        nstatobj.y = deebo.methods.findDataMode(justNull, jlen)
                    statData.push(nstatobj)
                    makeXLbl("N/A")
                }
                const nums = statData.map( function(d) {return d["y"] });
                let srtNums = nums.sort( function(a, b) {return a - b > 0 ? 1 : -1} )
                const max = srtNums[(nums.length-1)]
                let lbly = deebo.methods.sanitizeUi(numCol)
                const sym = dataTableService.methods.dataFilSrtTracker[numCol].colCellSymbol
                if(sym)
                    lbly += " ("+sym+")";
                icont.setAttribute("data-yaxis", lbly)
                xlbl.className = "bar-graph-x-label"
                xlbl.textContent = deebo.methods.sanitizeUi(deebo.methods.titleCase(strCol))
                deebo.methods.buildYAxisBGVals(max, barY)
                setTimeout( function() { 
                    const xlen = xlbls.length
                    const yWid = barY.getBoundingClientRect().width
                    const offY = Math.ceil(yWid+5);
                    const useIncr = Math.min(deebo.methods.maxBarWid, (Math.floor((icont.getBoundingClientRect().width-offY)/xlen)))
                    deebo.methods.buildBGBars(statData, max, useIncr, barY, barCt, sym);
                    setTimeout( function() { 
                        barXC.style.marginLeft = offY + "px";
                        barCt.style.marginLeft = offY + "px";
                        if(statBC)
                            statBC.style.marginLeft = offY + "px";
                        barCt.style.padding = "0"
                        let x = 0
                        const xbs = document.querySelectorAll("#" + parId + " .bg-ind-var")
                        for(x; x < xlen; x++)
                            xbs[x].style.width = useIncr + "px"
                    })
                })
            },

            buildBGBars: function(data, max, useIncr, yAx, barC, sym) {
                let i = 0
                const len = data.length
                let background;
                const maxHgt = yAx.getBoundingClientRect().height
                const whiteTxt = ["white", "#FFFFFF", "#ffffff", "rgb(255, 255, 255)", "rgb(255,255,255)"];
                if(deebo.methods.themeColor1 && whiteTxt.indexOf(deebo.methods.themeColor1) < 0)
                    background = deebo.methods.themeColor1;
                for(i; i < len; i++){
                    try{
                        const item = data[i]
                        const bhgt = item["y"]/max;
                        const strVal = item["y"].toLocaleString(undefined, {maximumFractionDigits: 2})
                        let symb4 = ""
                        let symaf = ""
                        if(sym){
                            let isCurr = ["$","€","£","¥","₣","₹"].indexOf(sym) > -1
                            if(isCurr)
                                symb4 = sym
                            else
                                symaf = sym
                        }
                        const fVal = item["x"] + ': ' + symb4 + strVal + symaf;
                        const gab = document.createElement("div")
                        const barCt = document.createElement("div")
                        gab.style.width = useIncr + "px";
                        gab.style.left = ((i*useIncr) + "px")
                        gab.className = "graph-actual-bar"
                        gab.setAttribute("data-value", fVal)
                        if(background)
                            barCt.style.background = background;
                        barCt.style.height = "0px";
                        gab.appendChild(barCt)
                        barC.appendChild(gab)
                        setTimeout( function() { barCt.style.height = (Math.ceil(bhgt*maxHgt) + "px") }, 150)
                    }catch(e){}
                }
            },

            buildYAxisBGVals: function(max, div) {
                // let diff = max - min
                const numPlots = 5
                const incr = max/(numPlots-1)
                for(let i = (numPlots-1); i >= 0; i--){
                    try{
                        const inc = i*incr
                        let useVal = inc//(min + inc)
                        const nt = document.createElement("div")
                        nt.className = "bg-dep-var"
                        if(i === 0)
                            useVal = 0//min
                        if(i === (numPlots-1)){
                            useVal = max
                            nt.className += " invisible"
                        }
                        if(i === 1)
                            nt.style.paddingBottom = "5px"
                        if(i === 2)
                            nt.style.paddingBottom = "9px"
                        if(i === 3)
                            nt.style.paddingBottom = "13px"
                        const finalVal = useVal < 1000 ? useVal.toLocaleString(undefined, {maximumFractionDigits: 0}) : deebo.methods.doBigData(useVal);
                        nt.setAttribute("data-number", finalVal)
                        if(i > 0)
                            nt.textContent = finalVal;
                        div.appendChild(nt)
                    }catch(e){}
                }
            },

            calcCurrChangeOverTime: function(useData, cont) {
                if(cont){
                    const dttype = typeof useData[0].dtColumn;
                    const srtData = useData.filter( function(a) {return !!a.dtColumn} ).sort( function(a, b) { 
                        return (dttype !== "object" ? (parseInt(a.dtColumn.toString()) - parseInt(b.dtColumn.toString())) : ( a.dtColumn.getTime() - b.dtColumn.getTime() ))
                    })
                    const srtLen = srtData.length
                    const firstVal = srtData[0].numColumn
                    const diff = srtData[srtLen-1].numColumn - firstVal
                    cont.innerHTML = (((diff > 0) ? "&plus; " : "") + ((diff/firstVal)*100).toLocaleString(undefined, { maximumFractionDigits: 2 }) + "%");
                    cont.classList.add(diff === 0 ? "neutral" : (diff > 0 ? "success" : "error-message"));
                }
            },

            findDataMedian: function(data, len) {
                if(len === 1)
                    return data[0]
                if(len === 2)
                    return (data[0]+data[1])/2
                const isOdd = len%2 !== 0
                if(isOdd){
                    return data[Math.ceil(len/2)]
                } else {
                    const loMed = data[len/2]
                    const hiMed = data[len/2] + 1
                    return (loMed+hiMed)/2
                }
            },

            getNumColumnValueCounts: function(data) {
                let i = 0
                let count = {}
                const len = data.length
                for(i; i < len; i++){
                    const d = data[i]
                    const val = "v" + d
                    if(!count[val] || typeof count[val] === "undefined")
                        count[val] = 1
                    else
                        count[val] += 1
                }
                return count;
            },

            findDataMode: function(data) {
                const count = deebo.methods.getNumColumnValueCounts(data)
                let most = null
                for(const prop in count){
                    if(!most)
                        most = {text: prop, amount: count[prop]}
                    if(count[prop] > most.amount)
                        most = {text: prop, amount: count[prop]}
                }
                if(most)
                    return parseInt(most?.text.replace("v", ""))
                return 0;
            },

            handleStatChange: function(e, resize) {
                const parts = e?.target?.id?.split("btn__");
                const id = parts[0]//((selOrFil || "") + "insField" + elIdCol)
                const stat = parts[1]
                const div = document.getElementById(id)
                if(div && stat){
                    if(e.target.classList.contains("stat-opt-btn-active") && !resize)
                        return;
                    e.target.classList.add("stat-opt-btn-active")
                    const dval = document.getElementById(id + "__valSel")?.value
                    const tVal = document.getElementById(id + "__timeDiffSel")?.value
                    let chosenBtn;
                    const lgbtn = document.querySelector("#" + id + " .btn-lg-sel")
                    //figure current lg-sel-btn
                    if(lgbtn){
                        const lgbcols =lgbtn.id?.replace(/^btn/, "").split("___")
                        if(lgbcols && lgbcols.length === 2)
                            chosenBtn = deebo.methods.replaceUniSep(lgbcols[1])
                    }
                    let data = deebo.methods.getCurrentInsightData()
                    div.innerHTML = ""
                    const selOrFil = (id && id.startsWith("insField")) ? "" : id.split("insField")[0];
                    const col = deebo.methods.replaceUniSep(id.replace(/^(filtered|selected)?insField/g, ""))
                    const inner = document.createElement("div")
                    const name = document.createElement("h3")
                    const wid = document.getElementById("dataTableBody").getBoundingClientRect().width
                    if(wid >= 760)
                        inner.style.width = "85%"
                    inner.style.paddingTop = "0"
                    name.className = "lg-text"
                    name.classList.add("semi-heavy")
                    name.style.marginBottom = "9px"
                    inner.appendChild(name)
                    div.appendChild(inner)
                    const reg = new RegExp(dataTableService.methods.bgSep, "g")
                    if(reg.test(col)){
                        const bgCols = col.split(dataTableService.methods.bgSep)
                        const strCol = bgCols[0]
                        const numCol = bgCols[1]
                        let dtCol
                        if(bgCols.length === 3)//line graph
                            dtCol = bgCols[2]
                        name.classList.add("center")
                        if(!dtCol){//bar graph
                            name.textContent = deebo.methods.titleCase(stat) + " " + deebo.methods.titleCase(numCol) + " by " + deebo.methods.titleCase(strCol);
                            const bgData = data.filter( function(d) { return d[numCol] === 0 || !!d[numCol] }).
                            map( function(d) { return ({strColumn: (d[strCol] || "N/A"), numColumn: d[numCol]})} );
                            setTimeout( function() { deebo.methods.buildBarGraphWithTwoCols(strCol, numCol, bgData, inner, id, stat) })
                        } else {
                            const elCol =col.replace(/ /g, deebo.methods.uniSep)
                            name.textContent = deebo.methods.titleCase(stat) + " " + deebo.methods.titleCase(numCol) + " by " + deebo.methods.titleCase(dtCol);
                            let uDates = []
                            const dSet = new Set(data.sort( function(a, b) {return a[dtCol] > b[dtCol] ? 1 : -1} ).
                            map( function(d) {return JSON.stringify(d[dtCol])} ))//unique dates
                            dSet.forEach( function(v) { 
                                const pdt = JSON.parse(v)
                                if(typeof pdt === "string")
                                    uDates.push(deebo.methods.coerceDate(pdt)) 
                                else
                                    uDates.push(pdt)
                            });
                            const mappedData = data.filter( function(d) {return d[numCol] === 0 || !!d[numCol]}).
                            map( function(d) {return ({strColumn: (d[strCol] || "N/A"), numColumn: d[numCol], dtColumn: d[dtCol]})})
                            deebo.methods.buildLg(id, mappedData, col, numCol, selOrFil, elCol, uDates, stat, dval, tVal)
                        }
                    } else {
                        name.textContent = deebo.methods.titleCase(col)
                        deebo.methods.buildLineGraphs([col], deebo.methods.numCols, data, selOrFil, stat, tVal, chosenBtn)
                    }
                }
            },

            barGLblMouseIn: function(e) {
                try{ e.target.classList.add("lbl-show") }catch(e){}
            },

            barGLblMouseOut: function(e) {
                try{ e.target.classList.remove("lbl-show") }catch(e){}
            },
            //bar graph

            //pie graph
            cleanUpPieLayovers: function() {
                let i = 0
                const cans = document.getElementsByTagName("canvas")
                const len = cans.length
                for(i; i < len; i++){
                    try{
                        const can = cans[i]
                        const par = can.parentElement
                        const lay = can.nextElementSibling//pie-layover
                        if(lay && lay.classList.contains("pie-layover")){
                            const cwid = can.width
                            const pbds = par.getBoundingClientRect()
                            const cbds = can.getBoundingClientRect()
                            const lbds = lay.getBoundingClientRect()
                            const cleft = (cbds.left - pbds.left)
                            const diff = cwid-lbds.width
                            lay.style.left = (cleft + (diff/2)) + "px"
                        }
                    }catch(e){}
                }
            },

            buildPieGraphFromColVals: function(par, counts, type) {
                let data = []
                const div = document.createElement("div")
                const odiv = document.createElement("div")
                const canvas = document.createElement("canvas");
                div.className = "center"
                div.classList.add("relly")
                odiv.className = "pie-layover"
                div.style.paddingTop = "33px"
                par.appendChild(div)
                const dbds = div.getBoundingClientRect()
                const cwid = dbds.width
                const canWid = Math.floor(cwid/3)
                canvas.width = canWid;
                canvas.height = canWid;
                div.appendChild(canvas)
                div.appendChild(odiv)
                const cBds = canvas.getBoundingClientRect()
                const oWid = Math.floor(cwid/3.8)
                odiv.style.width = oWid + "px"
                odiv.style.height = oWid + "px"
                const diff = cBds.width-oWid
                odiv.style.top = Math.floor((cBds.top-dbds.top) + (diff/2)) + "px";
                odiv.style.left = Math.floor((cBds.left-dbds.left) + (diff/2)) + "px";
                const ctx = canvas.getContext("2d");
                const props = Object.keys(counts)
                let colors = ["forestgreen", "crimson", "orange", "blue", "turquoise", "brown", "hotpink", "goldenrod", "purple", "olive", "steelblue", "black", 
                    "violet", "teal", "gray", "navy", "tan", "indigo"]
                const lbldiv = document.createElement("div")
                lbldiv.className = "chart-label-cont"
                par.appendChild(lbldiv)
                let rmNotes = []
                const na = "n_a"
                const oth = "Other"
                const dTotal = counts[deebo.methods.deboTotal]
                if(props.length >= 5){
                    const totalSansEmp = counts[na] ? (dTotal - counts[na]) : dTotal
                    for(const prop in counts){//first alter small percents to other
                        if(prop === deebo.methods.deboTotal || prop === oth)
                            continue
                        const percent = Math.ceil((counts[prop]/totalSansEmp)*100)
                        if(percent < 5){
                            if(!counts[oth] || typeof counts[oth] === "undefined")
                                counts[oth] = counts[prop]
                            else
                                counts[oth] += counts[prop]
                            delete counts[prop]
                        }
                    }
                }

                if(counts[oth])
                    props.push(oth)
                
                const isBool = type === "boolean" ? true : false;
                if(isBool || props.filter( function(p) { return p != deebo.methods.deboTotal }).length < 3)
                    colors = [(deebo.methods.themeColor1 || "#00a8f3"), (deebo.methods.themeColor2 || "black")]
                const numNa = counts[na]
                const rmNaPer = 65
                const perNa = numNa ? ((numNa/dTotal)*100) : 0
                const useTotal = (!isBool && numNa && (perNa > rmNaPer)) ? (dTotal-numNa) : dTotal
                for(const prop in counts){
                    if(prop === deebo.methods.deboTotal)
                        continue
                    const percent = (counts[prop]/useTotal)*100
                    const strPct = percent.toLocaleString(undefined, {maximumFractionDigits: 1})
                    if(strPct === "0")
                        continue
                    if(!isBool && (prop === na && perNa > rmNaPer)){
                        const rmNt = "Note: <b>N/A</b> values make up " + Math.floor(perNa).toLocaleString(undefined, {maximumFractionDigits: 0}) + "% of all values, " +
                                     "so we removed it from the chart to help visualize the make up of values in this column from the " + 
                                     Math.ceil(100-perNa).toLocaleString(undefined, {maximumFractionDigits: 0}) + "% that has values."
                        rmNotes.push(rmNt)
                        continue
                    }
                    const color = colors[props.indexOf(prop)]
                    data.push({ label: prop, value: counts[prop], color: color })
                    const cont = document.createElement("div")
                    const lbl = document.createElement("div")
                    const span = document.createElement("span")
                    cont.className = "pie-piece-label"
                    lbl.className = "pie-piece-label-sq"
                    lbl.style.background = color
                    span.textContent = deebo.methods.sanitizeUi(prop).replace(/n_a/, "N/A")
                    span.setAttribute("data-percent", (strPct+"%"))
                    cont.appendChild(span)
                    cont.appendChild(lbl)
                    lbldiv.appendChild(cont)
                }

                let r = 0
                const rlen = rmNotes.length
                for(r; r < rlen; r++){
                    const rmdiv = document.createElement("div")
                    rmdiv.className = r === 0 ? "pad-top-thirty" : "pad-top-ten";
                    rmdiv.classList.add("small-text")
                    rmdiv.innerHTML = rmNotes[r]
                    par.appendChild(rmdiv)
                }

                let n = 0
                let total = 0;
                const dlen = data.length
                for (n; n < dlen; n++) {
                    total += data[n].value;
                }

                const maxArr = data.sort( function(a, b) { return a.value < b.value ? -1 : 1 })
                const max = maxArr[(maxArr.length-1)]
                if(max && (max.value !== maxArr[0].value || maxArr.length === 1)){
                    odiv.style.color = max.color;
                    odiv.innerHTML = ("<div><div>" + deebo.methods.sanitizeUi(max.label) + '</div><div class="pad-top-sm">'+((max.value/total)*100).toFixed(1)+ '%</div></div>')
                }

                if(dlen > 1){
                    try{
                        let m = 0
                        let diffCts = []
                        for(m; m < dlen; m++){
                            const dct = data[m].value
                            if(diffCts.indexOf(dct) < 0)
                                diffCts.push(dct)
                        }
                        if(diffCts.length === 1){
                            let cltxt = par.firstElementChild.textContent.replace(/[ ]?table_chart/g, "");
                            if(!cltxt.endsWith("s"))
                                cltxt += "s";
                            odiv.innerHTML = ('<div><div><b class="ins-even-dist-ct">' + dlen + '</b> </div><div class="pad-top-sm">' +cltxt+ '</div></div>')
                        }
                    }catch(e){}
                }

                let i = 0
                let startAngle = 0;
                for (i; i < dlen; i++) {
                    const sliceAngle = 2 * Math.PI * data[i].value / total;

                    ctx.beginPath();
                    ctx.arc(canvas.width/2, canvas.height/2, Math.min(canvas.width, canvas.height)/2, startAngle, startAngle + sliceAngle);
                    ctx.lineTo(canvas.width/2, canvas.height/2);
                    ctx.fillStyle = data[i].color;
                    ctx.fill();
                    ctx.closePath();

                    startAngle += sliceAngle;
                }
            },

            showNumColValDist: function(selOrFil, elIdCol, colData, title, avg, sym) {//will be only numbers
                try{
                    const par = document.createElement("div")
                    par.className = "num-col-val-dist-cont"
                    const numArr = colData.sort( function(a, b) { return a - b });
                    const nlen = numArr.length;
                    const nmmin = numArr[0]
                    const nmmax = numArr[(nlen-1)]
                    const nmrange = nmmax - nmmin;
                    const nqtrdts = (nmrange/4) + nmmin
                    const nhalfdts = (nmrange/2) + nmmin
                    const nthrqtrdts = (nmrange*0.75) + nmmin
                    const nokTickVal = [nmmin, nqtrdts, nhalfdts, nthrqtrdts, nmmax]
                    const ntklen = nokTickVal.length
                    let naddedtks = []
                    let nadded = []
                    let t = 0
                    const maxDigs = nmrange > 3 ? 0 : 2;
                    for(t; t < ntklen; t++){
                        const ntkval = nokTickVal[t]?.toLocaleString(undefined, {maximumFractionDigits: maxDigs});
                        if(!ntkval || naddedtks.indexOf(ntkval) > -1 || ntkval === "NaN")
                            continue
                        const nmrk = document.createElement("div")
                        nmrk.className = "vd-n-marker"
                        nmrk.textContent = ntkval;
                        nmrk.setAttribute("data-value", ntkval)
                        par.appendChild(nmrk)
                        naddedtks.push(ntkval)
                    }
                    let h = 0
                    const hfrag = document.createDocumentFragment()
                    for(h; h < nlen; h++){//not seen but heard
                        const unum = numArr[h]
                        const usenval = unum?.toLocaleString(undefined, {maximumFractionDigits: maxDigs});
                        if(nadded.indexOf(usenval) > -1)
                            continue
                        const nmrk = document.createElement("div");
                        nmrk.className = "vd-n-marker-h"
                        const pct = ((unum-nmmin) / nmrange)
                        nmrk.setAttribute("data-perc", pct.toFixed(2))
                        nmrk.textContent = usenval;
                        nmrk.setAttribute("data-value", usenval)
                        hfrag.appendChild(nmrk)
                        nadded.push(usenval)
                    }
                    par.appendChild(hfrag)
                    /*avg marker*/
                    if(avg && typeof avg === "number"){
                        const anmrk = document.createElement("div");
                        anmrk.className = "vd-n-marker-h"
                        const pct = ((avg-nmmin) / nmrange)
                        anmrk.setAttribute("data-perc", pct.toFixed(2))
                        const usenval = avg.toLocaleString(undefined, {maximumFractionDigits: maxDigs});
                        anmrk.textContent = usenval;
                        anmrk.setAttribute("data-value", usenval)
                        par.appendChild(anmrk)
                        nadded.push(usenval)
                    }
                    /*avg marker*/
                    if(!naddedtks.length)
                        return document.createElement("span");
                    setTimeout( function() {
                        try{
                            let r =0
                            let hd =0
                            const halfPlot = 6
                            const pbds = par.getBoundingClientRect()
                            const outParId = ((selOrFil || "") + "insField" + elIdCol)
                            const mrks = document.querySelectorAll("#" + outParId + " .vd-n-marker")
                            const mrlen = mrks.length
                            const hmrks = document.querySelectorAll("#" + outParId + " .vd-n-marker-h")
                            const hmrlen = hmrks.length
                            const lastdtdv = mrks[mrlen-1].getBoundingClientRect()
                            const space = (pbds.right - (lastdtdv.right)) - halfPlot
                            const divby = Math.max(1, (mrlen-1))
                            const mrrgt = (Math.ceil(space/divby))//divide space up by count-1 because last gets no marg right
                            for(r; r < mrlen; r++){
                                const mrk = mrks[r]
                                mrk.style.left = Math.floor((mrrgt*r)) + "px";
                            }
                            const xrange = Math.min((mrks[mrlen-1].getBoundingClientRect().right - pbds.left) - (Math.ceil(lastdtdv.width/2)+halfPlot+1))
                            for(hd; hd < hmrlen; hd++){
                                const hmrk = hmrks[hd]
                                hmrk.style.left = (Math.floor(parseFloat(hmrk.getAttribute("data-perc"))*xrange)) + "px";
                            }
                            let mrkbds = mrks[0].getBoundingClientRect()
                            const findNLft = function(val, avg) {
                                let q = 0; let k = 0
                                for(q; q < mrlen; q++){
                                    try{
                                        const mrk = mrks[q]
                                        mrkbds = mrk.getBoundingClientRect()
                                        const dttxt = mrk.textContent
                                        let toadd = 0
                                        if(avg)
                                            toadd -= halfPlot
                                        if(val === dttxt || val === mrk.getAttribute("data-value"))
                                            return (parseInt(mrk.style.left.replace(/[ ]?(px\%)/g, ""))) + (((mrkbds.width/2)-halfPlot)-toadd)
                                    }catch(e){}
                                }
                                
                                for(k; k < hmrlen; k++){
                                    try{
                                        const hmrk = hmrks[k]
                                        const dttxt = hmrk.textContent
                                        let toadd = 0;
                                        if(avg)
                                            toadd -= halfPlot
                                        if(val === dttxt || val === hmrk.getAttribute("data-value"))
                                            return (parseInt(hmrk.style.left.replace(/[ ]?(px\%)/g, ""))) - toadd
                                    }catch(e){}
                                }
                                return null;
                            }
                            
                            let i = 0;
                            let minL = 0
                            const ifrag = document.createDocumentFragment()
                            const maxLft = Math.floor((pbds.right - mrks[0].getBoundingClientRect().left) - Math.ceil((lastdtdv.width/2)+1))
                            for(i; i < nlen; i++){
                                const usennum = numArr[i]?.toLocaleString(undefined, {maximumFractionDigits: maxDigs})
                                const plft = findNLft(usennum)
                                if((plft || plft === 0) && !isNaN(plft)){
                                    const ndiv = document.createElement("div")
                                    ndiv.className = "num-col-val-dist-bar"
                                    const dmn = Math.max(Math.ceil(plft), minL)
                                    if(i === (nlen-1))
                                        ndiv.style.left = dmn + "px";
                                    else
                                        ndiv.style.left = Math.min(dmn, maxLft) + "px";
                                    ndiv.setAttribute("data-number", usennum)
                                    if(deebo.methods.themeColor1)
                                        ndiv.style.background = deebo.methods.themeColor1
                                    if(i === 0 || i === (nlen-1)){
                                        ndiv.setAttribute("data-parent", outParId)
                                        ndiv.setAttribute("data-stat", ((i === 0) ? "min" : "max"));
                                        ndiv.addEventListener("mouseenter", deebo.methods.matchVdBarToStat)
                                        ndiv.addEventListener("mouseleave", deebo.methods.killAllVdHighlights)
                                    }
                                    ifrag.appendChild(ndiv)
                                    if(i === 0)//don't let anything lay before it
                                        minL = Math.ceil(Math.min(dmn, maxLft) + 1);
                                }
                            }
                            par.appendChild(ifrag)

                            /*avg marker*/
                            if(avg && typeof avg === "number"){
                                const useavg = avg.toLocaleString(undefined, {maximumFractionDigits: maxDigs})
                                const aplft = findNLft(useavg, true)
                                const adiv = document.createElement("div")
                                adiv.className = "num-col-avg-dist-bar"
                                adiv.setAttribute("data-number", useavg)
                                adiv.setAttribute("data-parent", outParId)
                                adiv.style.left = Math.floor(aplft) + "px";
                                adiv.addEventListener("mouseenter", deebo.methods.matchVdBarToStat)
                                adiv.addEventListener("mouseleave", deebo.methods.killAllVdHighlights)
                                par.appendChild(adiv)
                            }
                            /*avg marker */
                            title.textContent = title.textContent?.replace(/Building /g, "").replace(/distribution\.\.\./g, "distribution");
                            if(sym){
                                const botlbl = document.createElement("div")
                                botlbl.className = "center"
                                botlbl.classList.add("heavy")
                                botlbl.classList.add("pad-top-ten")
                                botlbl.textContent = "("+sym+")";
                                par.insertAdjacentElement("afterend", botlbl)
                            }
                        }catch(e){}
                    }, 20)
                    return par;
                } catch(e){return document.createElement("span")}
            },

            topIsInView: function(id) {
                const lg = document.getElementById(id)
                if(lg){
                    const lgTop = lg.getBoundingClientRect().top
                    return lgTop <= dataTableService.methods.tblBot
                }
                return true
            },

            buildLineGraphs: function(dtCols, numCols, data, selOrFil, stat, timeVal, lgSelNCol) {
                let c = 0;
                const clen = dtCols.length
                const nlen = numCols.length
                const useNCol = lgSelNCol || numCols[0]
                for(c; c < clen; c++){
                    let n = 0;
                    const col = dtCols[c]
                    const elCol = col.replace(/ /g, deebo.methods.uniSep)
                    const prettyDc = document.getElementById("header" + elCol)?.textContent
                    const parId = (selOrFil || "") + "insField" + elCol
                    const par = document.getElementById(parId)?.firstElementChild
                    if(!par)
                        continue
                    const hdiv = document.createElement("div")
                    hdiv.className = "lg-title-cont";
                    // const lim = 5000//don't auto load
                    if(nlen > 1/* || len > lim*/){//give options
                        for(n; n < nlen; n++){
                            const ncol = numCols[n]
                            const elNCol = ncol.replace(/ /g, deebo.methods.uniSep)
                            const prettyNc = document.getElementById("header" + elNCol)?.textContent
                            const obtn = document.createElement("button")
                            obtn.id = "btn" + elCol + "___" + elNCol;  
                            obtn.className = "btn-line-graph-opts";
                            obtn.disabled = true
                            if(selOrFil)
                                obtn.className += (" btn-line-graph-opts-" + selOrFil)
                            if((!lgSelNCol && n === 0) || (lgSelNCol && lgSelNCol === ncol)/* && len < lim*/)
                                obtn.classList.add("btn-lg-sel")
                            obtn.textContent = prettyNc + " by " + prettyDc;
                            obtn.onclick = deebo.methods.drawLineGraph
                            hdiv.appendChild(obtn)
                        }
                    } else {
                        const ncol = lgSelNCol || numCols[0]
                        const elNCol = ncol.replace(/ /g, deebo.methods.uniSep)
                        const prettyNc = document.getElementById("header" + elNCol)?.textContent
                        const ospn = document.createElement("span")
                        ospn.className = "sp-line-graph-title";
                        ospn.textContent = prettyNc + " by " + prettyDc;
                        hdiv.appendChild(ospn)
                    }
                    par.appendChild(hdiv)//keep order
                    deebo.methods.buildLg(parId, data, col, useNCol, selOrFil, elCol, null, stat, null, timeVal)
                }
            },

            buildLg: function(parId, valData, col, useNCol, selOrFil, elCol, uDates, stat, dVal, timeD) {
                let s = 0;
                const statCont = document.createElement("div")
                const auxCont = document.createElement("div")
                const grphCont = document.createElement("div")
                statCont.className = "center"
                statCont.className += " stat-opt-contain";
                const stLen = deebo.methods.statOpts.length
                for(s; s < stLen; s++){
                    const stt = deebo.methods.statOpts[s]
                    const statdv = document.createElement("div")
                    const sbtn = document.createElement("button")
                    statdv.className = "inline-b"
                    statdv.className += " center"
                    sbtn.className = "no-btn"
                    sbtn.className += " stat-opt-btn"
                    sbtn.id = parId + "btn__" + stt//critical to refresh bar graphs
                    if(stt === (stat || "avg"))
                        sbtn.className += " stat-opt-btn-active"
                    sbtn.onclick = deebo.methods.handleStatChange
                    sbtn.textContent = deebo.methods.titleCase(stt)
                    sbtn.disabled = true
                    statdv.appendChild(sbtn)
                    statCont.appendChild(statdv)
                }
                auxCont.className = "aux-opts-cont"
                const qdiv = document.createElement("div")
                const qdiv2 = document.createElement("div")
                const hdiv = document.createElement("div")
                qdiv.className = "qtr-wid"
                qdiv.className += " center"
                qdiv.className += " v-mid";
                qdiv2.className = "qtr-wid"
                qdiv2.className += " center"
                qdiv2.className += " v-mid";
                hdiv.className = "half-wid"
                hdiv.className += " center"
                hdiv.className += " v-mid";
                hdiv.className += " dontwrap";
                auxCont.appendChild(qdiv)
                auxCont.appendChild(qdiv2)
                auxCont.appendChild(hdiv)
                const fromOkLingGs = col.split(dataTableService.methods.bgSep)//if len
                const strODtCol = fromOkLingGs[0]
                let valOpts = []
                if(dataTableService.methods.dataFilSrtTracker[strODtCol].selDDVals && dataTableService.methods.dataFilSrtTracker[strODtCol].selDDVals.length){
                    const vals = dataTableService.methods.dataFilSrtTracker[strODtCol].selDDVals?.filter( function(g) {return g.checked && g.value !== "(Select All)"})
                    valOpts = vals.map( function(v) {return v.value})
                    const sel = document.createElement("select")
                    sel.id = parId + "__valSel";
                    sel.style.maxWidth = "80%"
                    sel.disabled = true
                    let v = 0
                    const vlen = valOpts.length
                    for(v; v < vlen; v++){
                        const vo = valOpts[v]
                        const opt = document.createElement("option")
                        opt.textContent = vo
                        opt.value = vo
                        if((dVal && vo === dVal) || (!dVal && v === 0))
                            opt.selected =true
                        sel.appendChild(opt)
                    }
                    sel.onchange = deebo.methods.handleLgValSelChange
                    qdiv.appendChild(sel)
                }
                grphCont.id = parId + "__lineGraph";
                grphCont.className = "inner-bg-contain";
                grphCont.style.marginBottom = "33px";
                const par = document.getElementById(parId)?.firstElementChild
                par.appendChild(statCont)
                par.appendChild(auxCont)
                par.appendChild(grphCont)//keep order
                grphCont.innerHTML = '<div class="flex-center lg-loading" style="height:297px"><div>Loading...</div></div>'
                let useData = []
                let unqDates = []
                if(fromOkLingGs.length === 3){//all else has been done
                    useData = valData.filter( function(d) {return d["strColumn"] === (dVal || valOpts[0])})
                } else {
                    const dSet = new Set(valData.sort( function(a, b) {return a[col] > b[col] ? 1 : -1} ).
                    map( function(d) {return JSON.stringify(d[col])} ))//unique dates
                    dSet.forEach( function(v) { 
                        const pdt = JSON.parse(v)
                        if(typeof pdt === "string")
                            unqDates.push(deebo.methods.coerceDate(pdt)) 
                        else
                            unqDates.push(pdt)
                    });
                    useData = valData.filter( function(d) {return d[useNCol] === 0 || !!d[useNCol]}).
                    map( function(d) {return ({numColumn: d[useNCol], dtColumn: d[col]})})
                }
                if(timeD && timeD != "-1"){
                    try{
                    const oneDay = (1000*60*60*24);
                    let oData = useData.filter( function(v) {return v && v["dtColumn"] && deebo.methods.isADateObject(v["dtColumn"]) && v["dtColumn"].toString() !== "Invalid Date"}).
                    sort( function(a, b) {return a["dtColumn"] > b["dtColumn"] ? 1 : -1} );
                    const vlen = oData.length
                    const lastDate = oData[(vlen-1)].dtColumn.getTime()
                    const cutoff = (lastDate-(timeD*oneDay))
                    useData = oData.filter( function(v) {return v["dtColumn"].getTime() >= cutoff} )
                    }catch(e){}
                }
                if(deebo.methods.topIsInView(parId)){
                    if (typeof Worker !== 'undefined'/* && deebo.methods.workerUrl !== "http://127.0.0.1:8080/worker.js"*/) {
                        try{
                            // Create a new
                            let worker
                            worker = new Worker(deebo.methods.workerUrl);
                            worker.onmessage = function({ data }) {//{ lineGraph: data.lineGraph, data: [] }
                                if(grphCont.id === data.lineGraph && document.getElementsByClassName("insight-field-row").length)
                                    setTimeout( function() { deebo.methods.drawLineGraph(null, grphCont, "dtColumn", col, "numColumn", useNCol, data.data, data.data.length, selOrFil, timeD) })
                            };
                            if(worker)
                                worker.postMessage({ lineGraph: grphCont.id, data: useData, uDates: (uDates || unqDates), stat: (stat || "avg") });
                        }catch(e){
                            const fUseData = deebo.methods.setUseableLgData(useData, (uDates || unqDates), (stat || "avg"))
                            setTimeout( function() { deebo.methods.drawLineGraph(null, grphCont, "dtColumn", col, "numColumn", useNCol, fUseData, fUseData.length, selOrFil, timeD) })
                        }
                    } else {
                        const fUseData = deebo.methods.setUseableLgData(useData, (uDates || unqDates), (stat || "avg"))
                        setTimeout( function() { deebo.methods.drawLineGraph(null, grphCont, "dtColumn", col, "numColumn", useNCol, fUseData, fUseData.length, selOrFil, timeD) })
                    }
                } else {
                    const lgs = deebo.methods.waitingInsightGraphs["lineGraphs"]
                    let lgneeds;
                    if(uDates || fromOkLingGs.length === 3){
                        lgneeds = { useId: parId, col: col, ncol: useNCol, data: useData, uDates: uDates }
                    } else {
                        lgneeds = { useId: parId, col: col, ncol: useNCol }
                    }
                    if(!lgs || typeof lgs === "undefined"){
                        deebo.methods.waitingInsightGraphs["lineGraphs"] = []
                        deebo.methods.waitingInsightGraphs["lineGraphs"].push(lgneeds)
                    } else {
                        lgs.push(lgneeds)
                    }
                }
            },

            handleLgValSelChange: function(e) {//for lineggraph with selValDDs
                const id = e?.target?.id
                if(id){
                    const val = e.target.value
                    const parts = e?.target?.id?.split("__valSel");
                    const id = parts[0]//((selOrFil || "") + "insField" + elIdCol)
                    const stat = "avg";
                    const div = document.getElementById(id)
                    if(div && stat){
                        let data = deebo.methods.getCurrentInsightData()
                        const tval = document.getElementById(id + "__timeDiffSel")?.value
                        div.innerHTML = ""
                        const selOrFil = (id && id.startsWith("insField")) ? "" : id.split("insField")[0];
                        const col = deebo.methods.replaceUniSep(id.replace(/^(filtered|selected)?insField/g, ""))
                        const inner = document.createElement("div")
                        const name = document.createElement("h3")
                        const wid = document.getElementById("dataTableBody").getBoundingClientRect().width
                        if(wid >= 760)
                            inner.style.width = "85%"
                        inner.style.paddingTop = "0"
                        name.className = "lg-text"
                        name.classList.add("semi-heavy")
                        name.style.marginBottom = "9px"
                        inner.appendChild(name)
                        div.appendChild(inner)
                        const reg = new RegExp(dataTableService.methods.bgSep, "g")
                        if(reg.test(col)){
                            const bgCols = col.split(dataTableService.methods.bgSep)
                            const strCol = bgCols[0]
                            const numCol = bgCols[1]
                            const dtCol = bgCols[2]
                            name.classList.add("center")
                            const elCol =col.replace(/ /g, deebo.methods.uniSep)
                            name.textContent = deebo.methods.titleCase(stat) + " " + deebo.methods.titleCase(numCol) + " by " + deebo.methods.titleCase(dtCol);
                            let uDates = []
                            const dSet = new Set(data.sort( function(a, b) {return a[dtCol] > b[dtCol] ? 1 : -1} ).
                            map( function(d) {return JSON.stringify(d[dtCol])} ))//unique dates
                            dSet.forEach( function(v) { 
                                const pdt = JSON.parse(v)
                                if(typeof pdt === "string")
                                    uDates.push(deebo.methods.coerceDate(pdt)) 
                                else
                                    uDates.push(pdt)
                            });
                            const mappedData = data.filter( function(d) {return d[numCol] === 0 || !!d[numCol]}).
                            map( function(d) {return ({strColumn: (d[strCol] || "N/A"), numColumn: d[numCol], dtColumn: d[dtCol]})})
                            deebo.methods.buildLg(id, mappedData, col, numCol, selOrFil, elCol, uDates, stat, val, tval)
                        }
                    }
                }
            },

            getYTDNumDays: function(dtmax) {
                try{
                    const dt = new Date()
                    const yr = dt.getFullYear()
                    const oneDay = (1000*60*60*24);
                    const jan1 = new Date("January 1, "+ yr +" 00:01:00")
                    const gap = Math.floor((dtmax.getTime() - jan1.getTime()) / oneDay)
                    return gap > 0 ? gap : null;
                } catch(e){ return null}
            },

            findTimeDiffOpts: function(milRange, dtmax, cont, id, timeD) {
                if(cont){
                    let i = 0
                    // const oneDay = (1000*60*60*24);
                    // const range = Math.floor(milRange/oneDay)
                    const ytd = "YTD"
                    const ytdNum = deebo.methods.getYTDNumDays(dtmax)
                    let avail = [{text: "1D", val: 1}, {text: "5D", val: 5},{text: "1M", val: 31},
                    {text: "6M", val: Math.ceil(365/2)}, {text: ytd, val: ytdNum},
                    {text: "1Y", val: 365}, {text: "5Y", val: ((365*5)+1)}]
                    if(!ytdNum)
                        avail = avail.filter( a => a.text !== ytd)
                    const len = avail.length
                    const sel = document.createElement("select")
                    const eopt = document.createElement("option")
                    sel.id = id.replace(/__lineGraph/g, "") + "__timeDiffSel";
                    eopt.value = "-1"
                    eopt.textContent= "All time"
                    if(!timeD)
                        eopt.selected = true
                    sel.appendChild(eopt)
                    for(i; i < len; i++){
                        const av = avail[i]
                        // if(range >= av.val){
                            const opt = document.createElement("option")
                            opt.textContent = av.text
                            opt.value = av.val
                            if(av.val === parseInt(timeD))
                                opt.selected = true
                            sel.appendChild(opt)
                        // }
                    }
                    sel.onchange = deebo.methods.updateTimeIntvl
                    cont.appendChild(sel)
                }
            },

            updateTimeIntvl: function(e) {
                const id = e?.target?.id
                if(id){
                    const val = e.target.value
                    const parts = e?.target?.id?.split("__timeDiffSel");
                    const id = parts[0]//((selOrFil || "") + "insField" + elIdCol)
                    const stat = "avg";
                    const div = document.getElementById(id)
                    if(div && stat){
                        let data = deebo.methods.getCurrentInsightData()
                        const dval = document.getElementById(id + "__valSel")?.value
                        //figure current lg-sel-btn
                        let chosenBtn;
                        const lgbtn = document.querySelector("#" + id + " .btn-lg-sel")
                        if(lgbtn){
                            const lgbcols =lgbtn.id?.replace(/^btn/, "").split("___")
                            if(lgbcols && lgbcols.length === 2)
                                chosenBtn = deebo.methods.replaceUniSep(lgbcols[1])
                        }
                        div.innerHTML = ""
                        const selOrFil = (id && id.startsWith("insField")) ? "" : id.split("insField")[0];
                        const col = deebo.methods.replaceUniSep(id.replace(/^(filtered|selected)?insField/g, ""))
                        const inner = document.createElement("div")
                        const name = document.createElement("h3")
                        const wid = document.getElementById("dataTableBody").getBoundingClientRect().width
                        if(wid >= 760)
                            inner.style.width = "85%"
                        inner.style.paddingTop = "0"
                        name.className = "lg-text"
                        name.classList.add("semi-heavy")
                        name.style.marginBottom = "9px"
                        inner.appendChild(name)
                        div.appendChild(inner)
                        const reg = new RegExp(dataTableService.methods.bgSep, "g")
                        if(reg.test(col)){
                            const bgCols = col.split(dataTableService.methods.bgSep)
                            const strCol = bgCols[0]
                            const numCol = bgCols[1]
                            const dtCol = bgCols[2]
                            name.classList.add("center")
                            const elCol =col.replace(/ /g, deebo.methods.uniSep)
                            name.textContent = deebo.methods.titleCase(stat) + " " + deebo.methods.titleCase(numCol) + " by " + deebo.methods.titleCase(dtCol);
                            let uDates = []
                            const dSet = new Set(data.sort( function(a, b) {return a[dtCol] > b[dtCol] ? 1 : -1} ).
                            map( function(d) {return JSON.stringify(d[dtCol])} ))//unique dates
                            dSet.forEach( function(v) { 
                                const pdt = JSON.parse(v)
                                if(typeof pdt === "string")
                                    uDates.push(deebo.methods.coerceDate(pdt)) 
                                else
                                    uDates.push(pdt)
                            });
                            const mappedData = data.filter( function(d) {return d[numCol] === 0 || !!d[numCol]}).
                            map( function(d) {return ({strColumn: (d[strCol] || "N/A"), numColumn: d[numCol], dtColumn: d[dtCol]})});
                            deebo.methods.buildLg(id, mappedData, col, numCol, selOrFil, elCol, uDates, stat, dval, val)
                        } else {
                            name.textContent = deebo.methods.titleCase(col)
                            deebo.methods.buildLineGraphs([col], deebo.methods.numCols, data, selOrFil, stat, val, chosenBtn)
                        }
                    }
                }
            },

            setUseableLgData: function(valArr, uDates, stat) {
                let d = 0;
                let useData = []
                const dlen = uDates.length
                for(d; d < dlen; d++){
                    let obj = {}
                    const dt = uDates[d]
                    const justVal = valArr.filter( function(d) {
                                    return d && d[("dtColumn")] && deebo.methods.isADateObject(d[("dtColumn")]) && d["dtColumn"].toString() !== "Invalid Date" &&
                                    deebo.methods.isADateObject(dt) && dt.toString() !== "Invalid Date" && d[("dtColumn")].getTime() === dt.getTime()} ).
                                    map( function(d) {return d[("numColumn")]} )
                    const jlen = justVal.length
                    if(jlen){
                        switch(stat){
                            case "avg":
                                obj = { dtColumn: dt, numColumn: (justVal.reduce( function(acc, curr) {return (acc += curr)}, 0)/jlen) }
                                break;
                            case "min":
                                obj = { dtColumn: dt, numColumn: (Math.min(...justVal)) }
                                break;
                            case "max":
                                obj = { dtColumn: dt, numColumn: (Math.max(...justVal)) }
                                break;
                            case "sum":
                                obj = { dtColumn: dt, numColumn: justVal.reduce( function(acc, curr) {return (acc += curr)} , 0) }
                                break;
                            case "median":
                                obj = { dtColumn: dt, numColumn: deebo.methods.findDataMedian(justVal, jlen) }
                                break;
                            case "mode":
                                obj = { dtColumn: dt, numColumn: deebo.methods.findDataMode(justVal) }
                                break;
                            default: "avg"
                                obj = { dtColumn: dt, numColumn: (justVal.reduce( function(acc, curr) {return (acc += curr)} , 0)/jlen) };
                        }
                        useData.push(obj)
                    }
                }
                return useData
            },

            sizeUpBgDims: function(lgContain, yAxis) {
                const yWid = yAxis.getBoundingClientRect().width
                const offY = Math.ceil(yWid+5)
                const statOCont = document.querySelector("#" + lgContain.parentElement.parentElement.id + " .stat-opt-contain")
                const auxCont = document.querySelector("#" + lgContain.parentElement.parentElement.id + " .aux-opts-cont")
                if(statOCont)
                    statOCont.style.marginLeft = offY + "px";
                if(auxCont)
                    auxCont.style.marginLeft = offY + "px";
            },

            enableLgBtns: function(par) {
                const cont = par.parentElement?.parentElement
                if(cont){
                    let i = 0; let s = 0
                    const btns = document.querySelectorAll("#" + cont.id + " button")
                    const sels = document.querySelectorAll("#" + cont.id + " select")
                    const len = btns.length
                    const slen = sels.length
                    for(i; i < len; i++)
                        btns[i].disabled = false
                    for(s; s < slen; s++)
                        sels[s].disabled = false
                }
            },

            drawLineGraph: function(event, par, dcol, dtcolnm, ncol, ncolnm, data, dlen, selOrFil, timeD) {
                if(event){//only txt in btn, its cool
                    const cols = event.target?.id?.replace(/^btn/, "").split("___")
                    if(cols && cols.length === 2){
                        dcol = deebo.methods.replaceUniSep(cols[0])
                        ncol = deebo.methods.replaceUniSep(cols[1])
                        ncolnm = deebo.methods.replaceUniSep(cols[1])
                        dtcolnm = deebo.methods.replaceUniSep(cols[0])
                        if(!data){
                            const cls = event.target.className.replace(/btn-line-graph-opts/g, "").replace(/-/g, "")
                            if(/filter/g.test(cls)){
                                selOrFil = cls.trim()
                                data = dataTableService.methods.currFilData.filter( function(d) { return true })
                            }
                            if(/select/g.test(cls)){
                                selOrFil = cls.trim()
                                data = dataTableService.methods.currSelRows.filter( function(d) { return true })
                            }
                            if(!data)
                                data = dataTableService.methods.mainData.filter( function(d) { return true })
                            dlen = data.length
                        }
                        let unqDates = []
                        const parId = (selOrFil || "") + "insField" + cols[0]
                        const dSet = new Set(data.sort( function(a, b) {return a[dcol] > b[dcol] ? 1 : -1} ).
                        map( function(d) {return JSON.stringify(d[dcol])} ))//unique dates
                        dSet.forEach( function(v) { 
                            const pdt = JSON.parse(v)
                            if(typeof pdt === "string")
                                unqDates.push(deebo.methods.coerceDate(pdt)) 
                            else
                                unqDates.push(pdt)
                        });
                        data = data.filter( function(d) {return d[ncol] === 0 || !!d[ncol]}).
                        map( function(d) {return ({numColumn: d[ncol], dtColumn: d[dcol]})})
                        timeD = document.getElementById(parId + "__timeDiffSel")?.value
                        if(timeD && timeD != "-1"){
                            try{
                            const vlen = data.length
                            const oneDay = (1000*60*60*24);
                            let oData = data.filter(function(d) {return true} ).sort( function(a, b) {return a["dtColumn"] > b["dtColumn"] ? 1 : -1} )
                            const lastDate = oData[(vlen-1)].dtColumn.getTime()
                            const cutoff = (lastDate-(timeD*oneDay))
                            data = data.filter( function(v) {return v["dtColumn"].getTime() >= cutoff} )
                            }catch(e){}
                        }
                        data = deebo.methods.setUseableLgData(data, unqDates, "avg")
                        const pSel = ("#" + parId + " .inner-bg-contain")
                        par = document.getElementById(parId + "__lineGraph") || document.querySelector(pSel);
                        deebo.methods.killAllSelLgBtns(event)
                        event.target.classList.add("btn-lg-sel")
                        dcol = "dtColumn";
                        ncol = "numColumn";
                        //switch dcol and ncol back to what we expect
                    }
                }
                if(par && dcol && ncol){
                    par.innerHTML = "";//inner-bg-contain
                    if(data && data.length){
                        try{
                            const lmarg = 60
                            // const numYPlots = 5
                            // const bgDepVarHgt = 70//height of y ticks
                            const totalHgt = 297;
                            const lg = document.createElement("div")
                            const canvas = document.createElement("canvas")
                            lg.className = "line-graph"
                            par.appendChild(lg)
                            const mainWid = Math.floor((par.getBoundingClientRect().width*0.92) -lmarg)
                            lg.style.width = mainWid + "px";
                            canvas.width = mainWid
                            canvas.height = totalHgt
                            canvas.className = "lg-canvas"
                            let lgbds = lg.getBoundingClientRect()
                            lg.style.height = totalHgt + "px";
                            lgbds = lg.getBoundingClientRect()
                            const ntickCont = document.createElement("div")
                            ntickCont.className = "lg-n-marker-cont"
                            ntickCont.style.height = totalHgt + "px";
                            let lbly = deebo.methods.titleCase(deebo.methods.sanitizeUi(ncolnm))
                            const sym = dataTableService.methods.dataFilSrtTracker[ncolnm]?.colCellSymbol
                            if(sym)
                                lbly += " ("+sym+")";
                            ntickCont.setAttribute("data-column", lbly)
                            // if(!warnmsg)
                                par.insertAdjacentElement("afterbegin", ntickCont)

                            let markToKill = false
                            const killLg = function(msg) {
                                ntickCont.innerHTML = ""
                                const useMsg = msg || "Not enough data for a graph"
                                return lg.innerHTML = '<div class="flex-center" style="height:'+totalHgt+'px"><div>'+useMsg+'</div></div>';
                            }

                            // if(warnmsg){
                            //     const wmsg = '<i class="material-icons error-message" aria-hidden="false" ' + 
                            //     'style="vertical-align:middle">warning</i> Load a Dot Plot at your own risk using a button above.';
                            //     return killLg(wmsg)
                            // }
                            const dtopts = {year: "2-digit",month: "2-digit", day: "numeric"}
                            //numbers
                            const numArr = data.filter( function(a) { return !!a[dcol] }).map( function(d) { return d[ncol] }).
                            filter( function(a) { return !!a && a >= 0 }).sort( function(a, b) { return (a - b)*-1 });
                            if(numArr.length < 2 || !numArr.some( function(n) { return n > 0 }))
                                markToKill = true//return killLg()
                            const nlen = numArr.length;
                            const nmmin = numArr[(nlen-1)]
                            const nmmax = numArr[0]
                            const nmrange = nmmax - nmmin;
                            const nqtrdts = (nmrange/4) + nmmin
                            const nhalfdts = (nmrange/2) + nmmin
                            const nthrqtrdts = (nmrange*0.75) + nmmin
                            const nokTickVal = [nmmax, nthrqtrdts, nhalfdts, nqtrdts, nmmin]//desc order!
                            const ntklen = nokTickVal.length
                            let naddedtks = []
                            let nadded = [];
                            let t = 0
                            const maxYVal = nmmax < 1000 ? nmmax.toLocaleString(undefined, {maximumFractionDigits: 0}) : deebo.methods.doBigData(nmmax);
                            for(t; t < ntklen; t++){
                                const val = nokTickVal[t]
                                const ntkval = val < 1000 ? val.toLocaleString(undefined, {maximumFractionDigits: 0}) : deebo.methods.doBigData(val);
                                if(naddedtks.indexOf(ntkval) > -1)
                                    continue
                                const nmrk = document.createElement("div")
                                nmrk.className = "bg-dep-var"
                                nmrk.textContent = ntkval;
                                if(ntkval === maxYVal)
                                  nmrk.classList.add("invisible")  
                                nmrk.setAttribute("data-number", ntkval)
                                if(val === nqtrdts)
                                    nmrk.style.paddingBottom = "5px"
                                if(val === nhalfdts)
                                    nmrk.style.paddingBottom = "9px"
                                if(val === nthrqtrdts)
                                    nmrk.style.paddingBottom = "13px"
                                ntickCont.appendChild(nmrk)
                                naddedtks.push(ntkval)
                            }
                            let i = 0
                            const ifrag = document.createDocumentFragment()
                            for(i; i < nlen; i++){//not seen but heard
                                const unum = numArr[i]
                                if(nadded.indexOf(unum) > -1)
                                    continue
                                const nmrk = document.createElement("div");
                                nmrk.className = "lg-n-marker-h"
                                const pct = (Math.max(1, unum-nmmin) / Math.max(1, nmrange))
                                nmrk.setAttribute("data-perc", pct.toFixed(2))
                                const usenval = unum?.toLocaleString(undefined, {maximumFractionDigits: 2});
                                nmrk.textContent = usenval;
                                nmrk.setAttribute("data-value", usenval)
                                ifrag.appendChild(nmrk)
                                nadded.push(usenval)
                            }
                            ntickCont.appendChild(ifrag)
                            //numbers

                            //dates
                            let arrFrmSet = []
                            const dSet = new Set(data.filter( function(a) { return !!a[ncol] }).map( function(d) { return d[dcol] }))//unique dates
                            dSet.forEach( function(v) { arrFrmSet.push(v) });
                            if(arrFrmSet.length < 2)
                                markToKill = true//return killLg()
                            const dttype = typeof arrFrmSet[0];
                            const ordDts = arrFrmSet.filter( function(a) { return !!a }).sort( function(a, b) { 
                                return (dttype !== "object" ? (parseInt(a.toString()) - parseInt(b.toString())) : ( a.getTime() - b.getTime() ))
                            })
                            let m = 0
                            let added = []
                            const olen = ordDts.length
                            const yearvals = ordDts.map( function(o) { return typeof o !== "object" ? o : o.getFullYear() })
                            const alloneyr = new Set(yearvals.filter( function(d) { return true })).size < 2;//unique years
                            // let yrReg = new RegExp("sjdkgf", "g")//not gonna replace anything
                            // if(alloneyr)
                            //     yrReg = new RegExp("\/" + yearvals[0], "g")
                            let dtrange
                            let dtmin; let dtmax;
                            if(typeof ordDts[0] === "object"){
                                dtmin = ordDts[0]
                                dtmax = ordDts[(ordDts.length-1)]
                            }
                            if(typeof ordDts[0] === "number"){
                                dtmin = ordDts[0]
                                dtmax = ordDts[(ordDts.length-1)]
                            }
                            if(typeof ordDts[0] === "string" && !isNaN(parseInt(ordDts[0])) && !isNaN(parseInt(ordDts[(ordDts.length-1)]))){
                                dtmin = parseInt(ordDts[0]);
                                dtmax = parseInt(ordDts[(ordDts.length-1)])
                            }
                            dtrange = typeof ordDts[0] === "object" ? (dtmax.getTime() - dtmin.getTime()) : (dtmax - dtmin)
                            if(!dtrange || typeof dtrange !== "number")
                                markToKill = true//return killLg()
                            const figureDtTicks = function(val) {
                                return typeof dtmin === "object" ? new Date(val+dtmin.getTime()) : (val+dtmin);
                            }
                            lg.innerHTML = ""
                            if(!event)
                                setTimeout( function() { deebo.methods.findTimeDiffOpts(dtrange, dtmax, par.previousElementSibling?.children[1], par.id, timeD) }, 500)
                            if(markToKill){//kill after timediff opts get built
                                deebo.methods.enableLgBtns(par)
                                return killLg();
                            }
                            // const qtrdts = figureDtTicks(Math.ceil(dtrange/4))
                            const halfdts = figureDtTicks(Math.ceil(dtrange/2))
                            // const thrqtrdts = figureDtTicks(Math.ceil(dtrange*0.75))
                            const okDtTks = [dtmin, /*qtrdts,*/ halfdts, /*thrqtrdts,*/ dtmax];
                            let de = 0
                            let addeddttks = []
                            const dtklen = okDtTks.length
                            for(de; de < dtklen; de++){
                                const tval = okDtTks[de]
                                const useDVal = deebo.methods.isADateObject(tval) ? tval.toLocaleDateString('en-US', dtopts)/*.replace(yrReg, "")*/ : tval
                                if(addeddttks.indexOf(useDVal) > -1)
                                    continue
                                const dmrk = document.createElement("div")
                                dmrk.className = "lg-dt-marker"
                                dmrk.textContent = useDVal;
                                dmrk.setAttribute("data-value", useDVal)
                                lg.appendChild(dmrk)
                                addeddttks.push(useDVal)
                            }
                            const ofrag = document.createDocumentFragment()
                            for(m; m < olen; m++){
                                const oval = ordDts[m]
                                const useDVal = deebo.methods.isADateObject(oval) ? oval.toLocaleDateString('en-US', dtopts)/*.replace(yrReg, "")*/ : oval
                                if(added.indexOf(useDVal) > -1)
                                    continue
                                const dmrk = document.createElement("div")
                                dmrk.className = "lg-dt-marker-h"
                                let pct
                                if(typeof ordDts[0] === "object")
                                    pct = ((ordDts[m].getTime()-ordDts[0].getTime()) / dtrange)
                                if(typeof ordDts[0] === "number")
                                    pct = ((ordDts[m]-ordDts[0]) / dtrange)
                                if(typeof ordDts[0] === "string")
                                    pct = ((parseInt(ordDts[m])-parseInt(ordDts[0])) / dtrange)
                                dmrk.setAttribute("data-perc", pct.toFixed(2))
                                dmrk.textContent = useDVal;
                                dmrk.setAttribute("data-value", useDVal)
                                ofrag.appendChild(dmrk)
                                added.push(useDVal)
                            }//space out the markers
                            lg.appendChild(ofrag)
                            //dates
                            //set graph dims
                            setTimeout( function() {
                            let r =0
                            let hd =0
                            // let y =0
                            const halfPlot = 2
                            const mrks = document.querySelectorAll("#" + par.id + " .lg-dt-marker")
                            const mrlen = mrks.length
                            const hmrks = document.querySelectorAll("#" + par.id + " .lg-dt-marker-h")
                            const hmrlen = hmrks.length
                             // const lastdtdv = mrks[mrlen-1].getBoundingClientRect()
                            const space = lgbds.width//(lgbds.right - (lastdtdv.right/*-lmarg*/)) - halfPlot
                            const divby = Math.max(1, (mrlen-1))
                            const mrrgt = Math.ceil(space/divby)//divide space up by count-1 because last gets no marg right
                            for(r; r < mrlen; r++)
                                mrks[r].style.left = (Math.floor(mrrgt*r)-halfPlot) + "px";
                            // const m0 = mrks[0].getBoundingClientRect()
                            setTimeout( function() {
                            lgbds = lg.getBoundingClientRect()
                            const xrange = space//mrks[mrlen-1].getBoundingClientRect().right - m0.left
                            for(hd; hd < hmrlen; hd++)
                                hmrks[hd].style.left = Math.floor(parseFloat(hmrks[hd].getAttribute("data-perc"))*(xrange/*-(m0.width/2)*/)) + "px";

                            const nmrks = document.querySelectorAll("#" + par.id + " .bg-dep-var")
                            const nmrlen = nmrks.length
                            const hnmrks = document.querySelectorAll("#" + par.id + " .lg-n-marker-h")
                            const hnmrlen = hnmrks.length
                            //set graph dims
                            //add x label
                            const lblx = document.createElement("div")
                            lblx.className = "lg-lbl-x"
                            const dtSpl = dtcolnm.split(dataTableService.methods.bgSep)
                            if(dtSpl.length === 3)
                                dtcolnm = dtSpl[2]
                            const pretXlbl = deebo.methods.sanitizeUi(deebo.methods.titleCase(dtcolnm))
                            lblx.textContent = pretXlbl
                            if(alloneyr)
                                lblx.textContent = yearvals[0] + " " + pretXlbl
                            lg.appendChild(lblx)
                            lg.appendChild(canvas)
                            //add x label
                            //add plots
                            const maxPtLft = xrange - halfPlot
                            const maxPtBot = lgbds.height - (halfPlot*6) - 1;
                            // const dtmrWid =mrks[0].getBoundingClientRect().width
                            setTimeout( function() {
                                const findDtLft = function(dt) {
                                    let q = 0; let k = 0
                                    const ptval = deebo.methods.isADateObject(dt) ? dt.toLocaleDateString('en-US', dtopts)/*.replace(yrReg, "")*/ : dt
                                    for(q; q < mrlen; q++){
                                        const dttxt = mrks[q].textContent
                                        if(ptval === dttxt || ptval === mrks[q].getAttribute("data-value"))
                                            return (parseInt(mrks[q].style.left.replace(/[ ]?(px\%)/g, "")) || 0)/* + (dtmrWid/2)*/ - halfPlot
                                    }
                                    
                                    for(k; k < hmrlen; k++){
                                        const dttxt = hmrks[k].textContent
                                        if(ptval === dttxt || ptval === hmrks[k].getAttribute("data-value"))
                                            return Math.min(maxPtLft, ((parseInt(hmrks[k].style.left.replace(/[ ]?(px\%)/g, "")) || 0))) - halfPlot
                                    }
                                    return null;
                                }
    
                                const nmrHgt =nmrks[0].getBoundingClientRect().height
                                const lbot = lgbds.bottom
                                const findNBot = function(num) {
                                    let q = 0; let k = 0
                                    const ptval = num?.toLocaleString(undefined, {maximumFractionDigits: 2});
                                    for(q; q < nmrlen; q++){
                                        const dttxt = nmrks[q].textContent
                                        if(ptval === dttxt || ptval === nmrks[q].getAttribute("data-value"))
                                            return Math.floor(lbot - nmrks[q].getBoundingClientRect().bottom) + (nmrHgt/2) - halfPlot/*halfPlot is half the dot*/
                                    }
                                    
                                    for(k; k < hnmrlen; k++){
                                        const hnmrk = hnmrks[k]
                                        const dttxt = hnmrk.textContent
                                        if((ptval === dttxt || ptval === hnmrk.getAttribute("data-value")) && hnmrk.getAttribute("data-perc")){
                                            const totalh = Math.floor(lgbds.height*(parseFloat(hnmrk.getAttribute("data-perc")) || 0)) + (nmrHgt/2) - halfPlot
                                            return Math.min(maxPtBot, Math.ceil(totalh))/*halfPlot is half the dot*/
                                        }
                                    }
                                    return null;
                                }
                                let p = 0;
                                let plots = []
                                let skipped = 0
                                let lgUndColor = ""
                                let lgColor = "#00a8f3"
                                const ctx = canvas.getContext("2d")
                                if(ctx){
                                    const whiteTxt = ["white", "#FFFFFF", "#ffffff", "rgb(255, 255, 255)", "rgb(255,255,255)"];
                                    if(dataTableService.methods.themeColor1 && whiteTxt.indexOf(dataTableService.methods.themeColor1) < 0)
                                        lgColor = dataTableService.methods.themeColor1;
                                    let useCol = lgColor
                                    if(lgColor.startsWith("#"))
                                        useCol = deebo.methods.hexToRgb(lgColor)
                                    else
                                        useCol = deebo.methods.getRgbParts(lgColor)
                                    if(useCol && typeof useCol === "object")
                                        lgUndColor = "rgba("+useCol.r+", "+useCol.g+", "+useCol.b+", 0.2)";
                                    const bSym = ((sym && ["$","€","£","¥","₣","₹"].indexOf(sym) > -1) ? sym : "");
                                    const aSym = ((!sym || sym && ["$","€","£","¥","₣","₹"].indexOf(sym) > -1) ? "" : sym);
                                    const minFrac = bSym ? 2 : 0;//currency
                                    const pfrag = document.createDocumentFragment()
                                    for(p; p < dlen; p++){
                                        try{
                                            const dval = data[p]
                                            if(!dval[dcol] || (typeof dval[ncol] !== "number"))
                                                continue;
                                            const plft = Math.max(0, findDtLft(dval[dcol]))
                                            const pbot = Math.max(0, findNBot(dval[ncol]))
                                            if(typeof plft !== "number" || typeof pbot !== "number")
                                                continue
                                            const pt = document.createElement("div")
                                            pt.className = "lg-plot";
                                            pt.className += " lg-plot-opq";
                                            const usedval = deebo.methods.isADateObject(dval[dcol]) ? dval[dcol].toLocaleDateString('en-US', dtopts)/*.replace(yrReg, "")*/ : dval[dcol]
                                            pt.setAttribute("data-date", usedval)
                                            pt.setAttribute("data-number", (bSym + dval[ncol].toLocaleString(undefined, {maximumFractionDigits: 2, minimumFractionDigits: minFrac}) + aSym))
                                            const ulft = (plft > 0 ? (plft+halfPlot) : plft)
                                            const ubot = (pbot+(halfPlot*2))
                                            pt.style.left = (ulft-4) + "px";
                                            pt.style.bottom = (ubot-4) + "px";
                                            pt.addEventListener("mouseenter", deebo.methods.showDotPlotInfo)
                                            pt.addEventListener("mouseleave", deebo.methods.hideDotPlotInfo)
                                            const ptbind = { left: ulft, bottom: ubot }
                                            const plen = plots.push(ptbind)
                                            const ptBef = plots[plen-(2+skipped)]
                                            if(ptBef){  
                                                const dx = ulft - ptBef.left;
                                                const dy = (lgbds.height-ubot) - (lgbds.height-ptBef.bottom);
                                                if(dx <= 20 && (p < (dlen-1))){
                                                    if(nokTickVal.indexOf(dval["numColumn"]) < 0){
                                                        skipped += 1;
                                                        continue
                                                    }
                                                }
                                                skipped = 0
                                                deebo.methods.drawCanvasLineGraph(ctx, dx, dy, ptBef.left, (lgbds.height-ptBef.bottom), lgColor, lgUndColor, totalHgt)
                                            }
                                            pfrag.appendChild(pt)
                                        }catch(e){}
                                    }
                                    lg.appendChild(pfrag)
                                }
                                deebo.methods.enableLgBtns(par)
                                deebo.methods.sizeUpBgDims(par, ntickCont)
                                deebo.methods.calcCurrChangeOverTime(data, par.previousElementSibling?.children[2])
                            })
                            })
                        }, 250)
                        //add plots
                        }catch(e){}
                    }
                }
            },

            drawCanvasLineGraph: function(ctx, sideA, sideB, xb, yb, color, ucolor, totalHgt) {
                // Define the vertices of the right triangle
                // Assuming the right angle is at (x1, y2)
                let x2 = xb + sideA;
                let y2 = yb + sideB; // Top-right vertex

                // Draw the hypotenuse
                ctx.beginPath();
                ctx.moveTo(xb, yb); // Start at one end of the hypotenuse
                ctx.lineTo(x2, y2); // Draw to the other end of the hypotenuse
                ctx.strokeStyle = color; // Make hypotenuse red for distinction
                ctx.lineWidth = 1;
                ctx.stroke();

                // Close the path to the bottom of the canvas for filling
                ctx.lineTo(x2, totalHgt); // Down to the bottom at the last x-coordinate
                ctx.lineTo(xb, totalHgt);  // Across to the bottom at the first x-coordinate
                ctx.closePath(); // Connects back to the starting point (50, 100)

                ctx.fillStyle = ucolor || color; // Set the fill color
                ctx.fill(); // Fill the enclosed area
            },

            matchVdBarToStat: function(e) {
                try{
                    let elIdCol = ""
                    let selOrFil = ""
                    let par = e.target.getAttribute("data-parent");
                    const stat = /avg/g.test(e.target.className) ? "avg" : e.target.getAttribute("data-stat");
                    if(par && stat){
                        const parts = par.split("insField");
                        if(parts.length === 1)
                            elIdCol = parts[0]
                        if(parts.length === 2){
                            selOrFil = parts[0] || "";
                            elIdCol = parts[1]
                        }
                        document.querySelector("#" + stat + selOrFil + elIdCol).lastElementChild.classList.add("save-hilite")
                    }
                } catch(e){}
            },

            killAllVdHighlights: function() {
                try{
                    const els = document.querySelectorAll(".insight-field .save-hilite")
                    const len = els.length
                    for(var i = (len-1); i >= 0; i--)
                        els[i].classList.remove("save-hilite")
                }catch(e){}
            },

            showDotPlotInfo: function(e) {
                const dt = e.target.getAttribute("data-date")
                const num = e.target.getAttribute("data-number")
                const eparId = e.target.parentElement.parentElement.id
                if(eparId){
                    const mrks = document.querySelectorAll("#" + eparId + " .lg-dt-marker")
                    const mrlen = mrks.length
                    const hmrks = document.querySelectorAll("#" + eparId + " .lg-dt-marker-h")
                    const hmrlen = hmrks.length
                    let q = 0; let k = 0
                    for(q; q < mrlen; q++){
                        const dttxt = mrks[q].textContent
                        if(dt === dttxt || dt === mrks[q].getAttribute("data-value"))
                            return mrks[q].classList.add("visible-marker")
                    }
                    
                    for(k; k < hmrlen; k++){
                        const dttxt = hmrks[k].textContent
                        if(dt === dttxt || dt === hmrks[k].getAttribute("data-value"))
                            return hmrks[k].classList.add("visible-marker")
                    }
    
                    q = 0;
                    k = 0;
                    const nmrks = document.querySelectorAll("#" + eparId + " .bg-dep-var")
                    const nmrlen = nmrks.length
                    const hnmrks = document.querySelectorAll("#" + eparId + " .lg-n-marker-h")
                    const hnmrlen = hnmrks.length
                    const ptval = num?.toLocaleString(undefined, {maximumFractionDigits: 2});
                    for(q; q < nmrlen; q++){
                        const dttxt = nmrks[q].textContent
                        if(ptval === dttxt || ptval === nmrks[q].getAttribute("data-value"))
                            nmrks[q].classList.add("visible-marker")
                    }
                    
                    for(k; k < hnmrlen; k++){
                        const dttxt = hnmrks[k].textContent
                        if(ptval === dttxt || ptval === hnmrks[k].getAttribute("data-value"))
                            return hnmrks[k].classList.add("visible-marker")
                    }
                }
            },

            hideDotPlotInfo: function(e) {
                const els = document.getElementsByClassName("visible-marker")
                const len = els.length
                for(var i = (len-1); i >= 0; i--)
                    els[i].classList.remove("visible-marker")
            },

            killAllSelLgBtns: function(event) {
                try{
                    const els = event.target.parentElement.children
                    const len = els.length
                    for(var i = (len-1); i >= 0; i--)
                        els[i].classList.remove("btn-lg-sel")
                }catch(e){}
            },

            //INSIGHTS

            mapCompToSym: function(comp) {
                switch(comp){//not all comps will get converted
                    case "Equals":
                    return "=";
                    case "Not Equal":
                    return "!=";
                    case "Less Than":
                    return "<";
                    case "Less Than or Equal":
                    return "<=";
                    case "Greater Than":
                    return ">";
                    case "Greater Than or Equal":
                    return ">=";
                }
                return comp;
            },

            getAllFilSrtInfo: function() {
                let filinfo = "Filtered By:";
                let srtinfo = "Sorted By:";
                const doWithoutFilt = ["Not Empty", "Empty"]
                const initB = " <span>";
                for(const prop in dataTableService.methods.dataFilSrtTracker){
                    const obj = dataTableService.methods.dataFilSrtTracker[prop]
                    const colNm = deebo.methods.sanitizeUi(deebo.methods.titleCase(prop));
                    if(obj && (obj.filter || dataTableService.methods.hasUnchkdDDVals(obj) || (obj.comparator && doWithoutFilt.indexOf(obj.comparator) > -1))){
                        const comp = deebo.methods.mapCompToSym(obj.comparator ? obj.comparator : (obj.type === "string" ? "Contains" : "Equals"))
                        let propFilTxt = (initB + colNm + "</span> " + comp)
                        if(obj.filter)
                            propFilTxt += (initB + deebo.methods.sanitizeUi(obj.filter) + "</span>");
                        if(!obj.filter && obj.selDDVals && obj.selDDVals.length && dataTableService.methods.hasUnchkdDDVals(obj)){
                            const chkdVals = obj.selDDVals.filter( function(v) { return v && v.checked} ).map( function(v) {return v.value}).join()
                            propFilTxt += (initB + chkdVals + "</span>");
                        }
                        if(propFilTxt.endsWith("Equals"))
                            propFilTxt = "";
                        if(filinfo === "Filtered By:"){
                            filinfo += propFilTxt
                        } else {
                            filinfo += ("," + propFilTxt)
                        }
                    }
                }
                let s = 0
                const solen = dataTableService.methods.sortOrder.length
                for(s; s < solen; s++){
                    const prop = dataTableService.methods.sortOrder[s]
                    const obj = dataTableService.methods.dataFilSrtTracker[prop]
                    if(obj && obj.sort){
                        const colNm = deebo.methods.sanitizeUi(deebo.methods.titleCase(prop));
                        const propSrtTxt = (initB + colNm + "</span> " + obj.sort)
                        if(srtinfo === "Sorted By:"){
                            srtinfo += propSrtTxt
                        } else {
                            srtinfo += ("," + propSrtTxt)
                        }
                    }
                }
                if(filinfo === "Filtered By:")
                    filinfo = "";
                if(srtinfo === "Sorted By:")
                    srtinfo = "";
                if(filinfo && srtinfo)
                    return (" &bull; " + filinfo + " &bull; " + srtinfo)
                if(filinfo && !srtinfo)
                    return (" &bull; " + filinfo)
                if(!filinfo && srtinfo)
                    return (" &bull; " + srtinfo)
                return "";
            },
        }

        return home

    }()
}()

dataTableService.methods = function() {

    var home = {}
    return function() {
        home = {

            sortOrder: [],
            mainData: null,
            mainDataLen: 0,
            tblBot: 0,
            tblTop: 0,
            tblLeft: 0,
            tblRight: 0,
            firstCol: "",
            primaryKey: "",
            currMapping: {},
            mapperWorkerId: 1,
            defltRHgt: "50px",
            currFilData: null,
            isFiltering: false,
            bgSep: "__forbargX",
            currSelRows: [],//just be an index of mainData
            visibleCols: [],//string arr
            displayOnlySelRows: false,
            dataFilSrtTracker: null,
            comparatorOpts: {
                text: ["Equals", "Not Equal", "Empty", "Not Empty", "Contains", "Starts With", "Ends With"],
                number: ["Equals", "Not Equal", "Empty", "Not Empty", "Less Than", "Less Than or Equal", "Greater Than", "Greater Than or Equal"],
                date: ["Equals", "Not on", "Empty", "Not Empty", "Before", "After"],
            },
            columnSymbols: [
                { column: "width", symbol: "px" },
                { column: "height", symbol: "px" },
                { column: "Unit Price", symbol: "$" },
                { column: "Unit Cost", symbol: "$" },
                { column: "Total Revenue", symbol: "$" },
                { column: "Total Cost", symbol: "$" },
            ],

            getNewTrackerObj: function(colName) {
                const symbol = dataTableService.methods.columnSymbols.filter( function(c){ return c.column === colName })[0]?.symbol?.substring(0, 2);
                return { 
                        filter: "", 
                        comparator: null, 
                        sort: null, 
                        type: "string", 
                        selDDVals: null,
                        minimize: false, 
                        freeze: false, 
                        colWidth: null,
                        colCellSymbol: symbol,
                    }
            },

            setTblVertBounds: function() {
                dataTableService.methods.tblBot = (document.getElementById("tableFooter")?.getBoundingClientRect().top || 0)
                dataTableService.methods.tblTop = (document.getElementsByClassName("data-table-headers")[0]?.getBoundingClientRect().bottom || 0)
            },

            setTblHorizBounds: function() {
                const dtBds = document.getElementsByClassName("data-table")[0]?.getBoundingClientRect()
                if(dtBds){
                    dataTableService.methods.tblLeft = (dtBds.left || 0) - 200
                    dataTableService.methods.tblRight = (dtBds.right || 0) + 250
                }
            },

            setTableBounds: function() {
                dataTableService.methods.setTblVertBounds()//critical
                dataTableService.methods.setTblHorizBounds()
            },

            elIsAboveFold: function(el, top) {
                if(el){
                    const elRect = el.getBoundingClientRect()
                    if(el && elRect && elRect.bottom < top)
                        return true
                    return false
                }
                return false;
            },

            elIsBelowFold: function(el, top) {
                if(el){
                    const elRect = el.getBoundingClientRect()
                    if(el && elRect && elRect.top > top)
                        return true
                    return false
                }
                return false;
            },

            buildDataFilSrtTracker: function(data) {
                let i = 0
                let obj = {}
                const len = data.length
                for(i; i < len; i++)
                    obj[data[i]] = dataTableService.methods.getNewTrackerObj(data[i])
                return obj
            },

            resetFilSrtTracker: function(keepMins) {
                for(const prop in dataTableService.methods.dataFilSrtTracker){
                    const fsObj = dataTableService.methods.dataFilSrtTracker[prop]
                    const oType = fsObj["type"]//keep
                    const ddvals = fsObj["selDDVals"]?.map( function(v) {v.checked = true; return v})//keep
                    const oWid = fsObj["colWidth"]//keep
                    const sym = fsObj["colCellSymbol"]//keep
                    const min = keepMins ? fsObj["minimize"] : false;
                    const elId = prop?.replace(/ /g, deebo.methods.uniSep)
                    const colFilEl = document.getElementById("filter" + elId)
                    const comp = document.getElementById("selectComp" + elId);
                    const compToUse = (colFilEl && colFilEl.nodeName === "SELECT") ? "Equals" : null;
                    if(compToUse === "Equals")
                        comp.value = "Equals";
                    dataTableService.methods.dataFilSrtTracker[prop] = { filter: "", comparator: compToUse, sort: null, type: oType, selDDVals: ddvals, minimize: min, 
                        freeze: false, colWidth: oWid, colCellSymbol: sym,
                    }
                }
            },

            specialIndexSort: function(data, specialIndexes) {//currFil will reflect mainData at this point
                let sortData = data.map( function(d, ind) { return  { index: ind, obj: d } })
                return sortData.sort( function(a, b) { return specialIndexes.indexOf(a.index) > -1 ? -1 : 1 }).
                map( function(d) { return d.obj })
            },

            nLevelSort: function(data, sortOrder, obj) {
                let sortData = data.filter( function(d) { return true })
                const len = sortOrder.length
                for(var i = (len-1); i >= 0; i--){
                    const field = sortOrder[i]
                    const dir = obj[field]["sort"] === "asc" ? 1 : -1;
                    sortData = sortData.sort( function(a, b) { 
                        if(!a[field] && a[field] !== 0)
                            return 1
                        if(!b[field] && b[field] !== 0)
                            return -1
                        if(a[field] > b[field])
                            return (1*dir)
                        if((a[field] === b[field]) || (JSON.stringify(a[field]) === JSON.stringify(b[field])))
                            return 0
                        return (-1*dir)
                    })
                }
                return sortData
            },

            doSortOnField: function(field) {
                const btn = document.getElementById("btnSort" + field.replace(/ /g, deebo.methods.uniSep))
                if(!dataTableService.methods.sortOrder.length || dataTableService.methods.sortOrder.indexOf(field) < 0){
                    dataTableService.methods.sortOrder.push(field)
                    dataTableService.methods.dataFilSrtTracker[field]["sort"] = "asc"
                    try { 
                        btn.firstElementChild.textContent = "arrow_downward"
                        dataTableService.methods.execSortOrderIndicator(btn, field.replace(/ /g, deebo.methods.uniSep), (dataTableService.methods.sortOrder.indexOf(field)+1)) 
                    } catch(e){}
                } else {
                    let currSort = dataTableService.methods.dataFilSrtTracker[field]["sort"]
                    switch(currSort){
                        case "desc":
                            dataTableService.methods.dataFilSrtTracker[field]["sort"] = null
                            dataTableService.methods.execSortOrderIndicator(btn, field.replace(/ /g, deebo.methods.uniSep))//removes it
                            dataTableService.methods.sortOrder = dataTableService.methods.sortOrder.filter( function(s) { return s !== field })
                        break;
                        case "asc":
                            dataTableService.methods.dataFilSrtTracker[field]["sort"] = "desc"
                            try { btn.firstElementChild.textContent = "arrow_upward" } catch(e){}
                        break;
                    }
                }
                dataTableService.methods.currFilData = dataTableService.methods.nLevelSort(dataTableService.methods.currFilData, dataTableService.methods.sortOrder, dataTableService.methods.dataFilSrtTracker)
            },

            execSortOrderIndicator: function(btn, field, number) {
                const el = document.getElementById("sortInd" + field)
                if(el)
                    return el.parentElement.removeChild(el)
                const sup = document.createElement("sup")
                sup.id = "sortInd" + field
                sup.className = "sort-order-indicator"
                sup.textContent = number
                sup.addEventListener("click", function(e) { e && e.stopPropagation(); try{ sup.previousElementSibling.click() }catch(e) { } })
                sup.addEventListener("mousemove", function(e) { e && e.stopPropagation()})
                sup.addEventListener("mousedown", function(e) { e && e.stopPropagation()})
                sup.addEventListener("mouseup", function(e) { e && e.stopPropagation()})
                sup.addEventListener("touchstart", function(e) { e && e.stopPropagation()})
                sup.addEventListener("touchmove", function(e) { e && e.stopPropagation()})
                sup.addEventListener("touchend", function(e) { e && e.stopPropagation()})
                btn.insertAdjacentElement("afterend", sup)
            },

            nLevelFilter: function(data, filterVal, ddVals, comparator, field) {
                const sixHrs = (1000*60*60*6)
                const oneDay = (1000*60*60*24)
                const symReg = new RegExp(/[$€£₹¥¢\,]/, "g")
                const isDtReg = new RegExp(/\d+(\/|-)\d+(\/|-)\d+/)
                if(filterVal && typeof filterVal === "string"){
                    filterVal = filterVal.toLocaleLowerCase()
                    if(!deebo.methods.idCol(field) && !isDtReg.test(filterVal) && !isNaN(parseInt(filterVal.replace(symReg, ""))))//not viewed as num, but can be
                        filterVal = /\./g.test(filterVal) ? parseFloat(filterVal.replace(symReg, "")) : parseInt(filterVal.replace(symReg, ""))
                    if(deebo.methods.testShortDate(filterVal) || deebo.methods.testISODate(filterVal) || deebo.methods.testLongDate(filterVal))
                        filterVal = new Date(filterVal)
                }
                return data.filter( function(d) {
                    if(!ddVals && (!filterVal && filterVal != "0") && (!comparator || (comparator && comparator !== "Not Empty" && comparator !== "Empty")))
                        return true
                    let colVal = d[field]
                    if(typeof colVal === "string")
                        colVal = colVal.toLocaleLowerCase()
                    if(!comparator){//what we did originally
                        if(ddVals && ddVals.length){
                            const chkdVs = ddVals.filter( function(d) { return d.checked }).
                            map( function(v) { return typeof v.value === "string" ? v.value.toLocaleLowerCase() : v.value })
                            return chkdVs.indexOf(colVal) > -1
                        } else {
                            if(typeof colVal === "string")
                                return (colVal == filterVal || colVal.startsWith(filterVal) || colVal.indexOf(filterVal) > -1)
                            if(typeof colVal === "number")
                                return (colVal == filterVal)//assume equals
                            if(deebo.methods.isADateObject(filterVal) && deebo.methods.isADateObject(colVal))
                                return Math.abs(colVal.getTime() - filterVal.getTime()) < sixHrs
                            return colVal == filterVal
                        }
                    } else {
                        if(comparator === "Equals"){
                            if(ddVals && ddVals.length){
                                const chkdVs = ddVals.filter( function(d) { return d.checked }).
                                map( function(v) { return typeof v.value === "string" ? v.value.toLocaleLowerCase() : v.value })
                                return chkdVs.indexOf(colVal) > -1
                            } else {
                                if(deebo.methods.isADateObject(filterVal) && deebo.methods.isADateObject(colVal))
                                    return Math.abs(colVal.getTime() - filterVal.getTime()) < sixHrs
                                return colVal == filterVal
                            }
                        }
                        if(comparator === "Not Equal" || comparator === "Not on"){
                            if(ddVals && ddVals.length){
                                const chkdVs = ddVals.filter( function(d) { return !d.checked }).
                                map( function(v) { return typeof v.value === "string" ? v.value.toLocaleLowerCase() : v.value })
                                return chkdVs.indexOf(colVal) > -1
                            } else {
                                if(deebo.methods.isADateObject(filterVal) && deebo.methods.isADateObject(colVal))
                                    return Math.abs(colVal.getTime() - filterVal.getTime()) > oneDay
                                return colVal != filterVal
                            } 
                        }
                        if(comparator === "Contains")
                            return colVal && ((typeof colVal === "string" && colVal.indexOf(filterVal) > -1) || colVal == filterVal)
                        if(comparator === "Starts With")
                            return colVal && ((typeof colVal === "string" && colVal.startsWith(filterVal)) || (typeof colVal !== "string" && colVal.toString().startsWith(filterVal)))
                        if(comparator === "Ends With")
                            return colVal && ((typeof colVal === "string" && colVal.endsWith(filterVal)) || (typeof colVal !== "string" && colVal.toString().endsWith(filterVal)))
                        if(comparator === "Less Than" || comparator === "Before")
                            return colVal < filterVal
                        if(comparator === "Less Than or Equal")
                            return colVal <= filterVal
                        if(comparator === "Greater Than" || comparator === "After")
                            return colVal > filterVal
                        if(comparator === "Greater Than or Equal")
                            return colVal >= filterVal
                        if(comparator === "Not Empty"){
                            if(ddVals && ddVals.length && dataTableService.methods.hasUnchkdDDVals(dataTableService.methods.dataFilSrtTracker[field])){
                                const chkdVs = ddVals.filter( function(d){ return d.checked && d.value } ).
                                map( function(v) { return typeof v.value === "string" ? v.value.toLocaleLowerCase() : v.value })
                                return chkdVs.indexOf(colVal) > -1
                            }
                            if(!filterVal && filterVal != "0")
                                return !!colVal || (colVal === 0)//just return non empty
                            //treat it like normal filter
                            if(typeof colVal === "string")
                                return (colVal == filterVal || colVal.startsWith(filterVal) || colVal.indexOf(filterVal) > -1)
                            if(typeof colVal === "number")
                                return (colVal == filterVal || colVal.toString().startsWith(filterVal) || colVal.toString().indexOf(filterVal) > -1)
                            if(deebo.methods.isADateObject(filterVal) && deebo.methods.isADateObject(colVal))
                                return Math.abs(colVal.getTime() - filterVal.getTime()) < sixHrs
                            return colVal == filterVal
                        }
                        if(comparator === "Empty")
                            return (!colVal && colVal !== 0)
                        return false
                    }
                }).sort( function(a, b) { 
                    if(comparator)
                        return 0
                    const colVal = a[field]
                    if(colVal && typeof colVal === "string")
                        return (colVal.toLocaleLowerCase() == filterVal || colVal.toLocaleLowerCase().startsWith(filterVal)) ? -1 : 1
                    if(colVal && typeof colVal === "number")
                        return (colVal == filterVal || colVal.toString().startsWith(filterVal)) ? -1 : 1
                    return 0
                 })
            },
    
            columnFilter: function(dataI, field, dataObj, sortOrder, manual) {
                if(manual && !dataTableService.methods.displayOnlySelRows && !dataObj[field].filter && dataTableService.methods.arefilSrtTrkPropsDefault(true))
                    return dataTableService.methods.currFilData = dataTableService.methods.mainData.filter( function(d) { return true })
                const initData = !dataTableService.methods.displayOnlySelRows ? dataI :
                dataI.filter( function(d, ind) { return dataTableService.methods.currSelRows.indexOf(ind) > -1 })
                let dataM = dataTableService.methods.nLevelFilter(initData, dataObj[field].filter, dataObj[field].selDDVals, dataObj[field].comparator, field)
                const doWithoutFilt = ["Not Empty", "Empty"]
                for(const prop in dataObj){
                    if(field === prop) 
                        continue;
                    if((dataObj[prop].filter || dataTableService.methods.hasUnchkdDDVals(dataObj[prop])) || (dataObj[prop].comparator && doWithoutFilt.indexOf(dataObj[prop].comparator) > -1))
                        dataM = dataTableService.methods.nLevelFilter(dataM, dataObj[prop].filter, dataObj[prop].selDDVals, dataObj[prop].comparator, prop)
                }
                dataTableService.methods.currFilData = dataTableService.methods.nLevelSort(dataM, sortOrder, dataObj)
            },

            hasUnchkdDDVals: function(obj) {
                if(obj && obj.selDDVals && obj.selDDVals.length)
                    return obj.selDDVals.filter( function(v) { return v && !v.checked } ).length
                return false
            },

            easyFilter: function(val, dataI, sortOrder) {
                const initData = !dataTableService.methods.displayOnlySelRows ? dataI :
                dataI.filter( function(d, ind) { return dataTableService.methods.currSelRows.indexOf(ind) > -1 })
                let dataM = dataTableService.methods.allDataFilter(val, initData)
                dataTableService.methods.currFilData = dataTableService.methods.nLevelSort(dataM, sortOrder, dataTableService.methods.dataFilSrtTracker)
            },

            allDataFilter: function(filterVal, data) {
                const sixHrs = (1000*60*60*6)
                const symReg = new RegExp(/[$€£₹¥¢\,]/, "g")
                const isDtReg = new RegExp(/\d+(\/|-)\d+(\/|-)\d+/)
                if(filterVal && typeof filterVal === "string"){
                    filterVal = filterVal.toLocaleLowerCase()
                    if(!isDtReg.test(filterVal) && !isNaN(parseInt(filterVal.replace(symReg, ""))))//not viewed as num, but can be
                        filterVal = /\./g.test(filterVal) ? parseFloat(filterVal.replace(symReg, "")) : parseInt(filterVal.replace(symReg, ""))
                    if(deebo.methods.testShortDate(filterVal) || deebo.methods.testISODate(filterVal) || deebo.methods.testLongDate(filterVal))
                        filterVal = new Date(filterVal)
                }
                return data.filter( function(d) {
                    if(!filterVal && filterVal != "0")
                        return true
                    for(const prop in d){
                        let colVal = d[prop]
                        if(typeof colVal === "string")
                            colVal = colVal.toLocaleLowerCase()
                        if(typeof colVal === "string" && (colVal == filterVal || colVal.startsWith(filterVal) || colVal.indexOf(filterVal) > -1))
                            return true
                        if(typeof colVal === "number" && (colVal == filterVal || colVal.toString().startsWith(filterVal) || colVal.toString().indexOf(filterVal) > -1))
                            return true
                        if(deebo.methods.isADateObject(filterVal) && deebo.methods.isADateObject(colVal) && 
                            (Math.abs(colVal.getTime() - filterVal.getTime()) < sixHrs || (colVal == filterVal || 
                            colVal.startsWith(filterVal) || colVal.indexOf(filterVal) > -1)))
                                return true
                        if(colVal == filterVal)
                            return true
                    }
                    return false
                })
            },

            arefilSrtTrkPropsDefault: function(ignoreColFM) {
                for(const prop in dataTableService.methods.dataFilSrtTracker){
                    const elId= prop.replace(/ /g, deebo.methods.uniSep)
                    const obj = dataTableService.methods.dataFilSrtTracker[prop]
                    if(obj && (obj.filter || obj.comparator || obj.sort || obj.minimize || obj.freeze || obj.selDDVals)){
                        const fm = ignoreColFM ? true : (!obj.minimize && !obj.freeze);
                        const defComp = !obj.comparator || ["Equals", "Contains"].indexOf(obj.comparator) > -1;
                        if(!obj.filter && !obj.sort && fm && defComp && document.getElementById("selectComp" + elId) && 
                        (!obj.selDDVals || (obj.selDDVals && !obj.selDDVals.filter( function(v) { return v && !v.checked } ).length))){
                            //let it go
                        } else
                            return false
                    }
                }
                return true
            },

        }
        return home
    }()
}()

tblDragEvents.methods = function() {

    var home = {}
    return function() {
        home= {

            colDragStartFrmHeaderTracker: { col: null, xstart: null, ystart: null, resized: false },
            colDragStartFrmCellTracker: { col: null, row: null, xstart: null, ystart: null, resized: false },
            tblDragStartFrmPagiTracker: { row: null, ystart: null, resized: false },
            didResizeOnEvent: false,
            colMoving: false,

            checkItemBorderCursor: function(e) {
                try{
                    if(tblDragEvents.methods.colMoving)
                        return
                    const el = e.target
                    const offsx = 11; const offsy = 9;
                    const cls = "moveable-col"
                    const rcls = "moveable-row"
                    const bds = el.getBoundingClientRect()
                    if(e.offsetX >= bds.width-offsx){
                        el.classList.add(cls)
                        el.classList.remove(rcls)
                    } else {
                        el.classList.remove(cls)
                    }
                    if(e.offsetY >= bds.height-offsy){
                        el.classList.add(rcls)
                        el.classList.remove(cls)
                    } else {
                        el.classList.remove(rcls)
                    }
                }catch(err){}
            },

            checkPaginatorBorderCursor: function(e) {
                try{
                    const el = e.target
                    const offsy = 9;
                    const rcls = "moveable-row"
                    const bds = el.getBoundingClientRect()
                    if(e.offsetY >= bds.height-offsy){
                        el.classList.add(rcls)
                    } else {
                        el.classList.remove(rcls)
                    }
                }catch(err){}
            },

            handleHeaderSizeAdjust: function(e) {
                e && e.preventDefault()
                let col
                const cls = "moveable-col"
                const rcls = "moveable-row"
                const clist = e.target.classList
                if(e.type === "mousedown"){
                    if(e && e.target.id && /columnHeader/g.test(e.target.id))
                        col = e.target
                    if(e && e.target.parentElement.id && /columnHeader/g.test(e.target.parentElement.id))
                        col = e.target.parentElement
                    if(col){
                        const cBds = col.getBoundingClientRect()
                        if(clist.contains(cls)){
                            let rootCol;
                            let useX = e.offsetX
                            if(useX > ((cBds.right-cBds.left)/2)){//the one we're aiming for IS the target
                                useX = (useX - cBds.width)
                                rootCol = col.id.replace(/columnHeader/g, "")
                            } else {
                                if(!col.nextElementSibling && (e.offsetX > ((cBds.right-cBds.left)/2)))//last and grabbing the end of it
                                    rootCol = col.id.replace(/columnHeader/g, "")
                                else
                                    rootCol = col.previousElementSibling.id.replace(/columnHeader/g, "")
                            }
                            deebo.methods.currColumnEdit =rootCol
                            tblDragEvents.methods.colDragStartFrmHeaderTracker = { col: rootCol, xstart: useX, ystart: null, resized: false }
                            window.addEventListener("mouseup", tblDragEvents.methods.handleColResMouseUp)
                        }
    
                        if(clist.contains(rcls)){
                            deebo.methods.currColumnEdit = null
                            tblDragEvents.methods.colDragStartFrmHeaderTracker = { col: null, xstart: null, ystart: e.pageY, resized: false }
                            window.addEventListener("mouseup", tblDragEvents.methods.handleColResMouseUp)
                        }

                        if(!clist.contains(cls) && !clist.contains(rcls)){//drag column to diff position
                            let rootCol;
                            tblDragEvents.methods.colMoving = true
                            rootCol = col.id.replace(/columnHeader/g, "")
                            deebo.methods.currColumnEdit =rootCol
                            tblDragEvents.methods.colDragStartFrmHeaderTracker = { col: rootCol, xstart: null, ystart: null, resized: false }
                            window.addEventListener("mouseup", tblDragEvents.methods.handleColMoveMouseUp)
                        }
                    }
                }

                if(e.type === "mousemove"){
                    if(!tblDragEvents.methods.colMoving){
                        if(tblDragEvents.methods.colDragStartFrmHeaderTracker.col && deebo.methods.currColumnEdit === tblDragEvents.methods.colDragStartFrmHeaderTracker.col)
                            tblDragEvents.methods.doHeaderWidth(e)
    
                        if(tblDragEvents.methods.colDragStartFrmHeaderTracker.ystart)
                            tblDragEvents.methods.doHeaderHeight(e)
                    } else {
                        tblDragEvents.methods.handleColMoveMouseUp(e)
                    }
                }
            },

            handleCellSizeAdjust: function(e) {
                let col
                const cls = "moveable-col"
                const rcls = "moveable-row"
                const clist = e.target.classList
                if(e.type === "mousedown" && /data-cell/g.test(e.target.className)){
                    if(e && e.target && /data-cell/g.test(e.target.className))
                        col = e.target
                    if(e && e.target.parentElement && /data-cell/g.test(e.target.parentElement.className))
                        col = e.target.parentElement
                    if(clist.contains(cls)){
                        if(col){
                            let rootCol
                            let useX = e.offsetX
                            const cBds = col.getBoundingClientRect()
                            if(useX > ((cBds.right-cBds.left)/2)){//the one we're aiming for IS the target
                                useX = (useX - cBds.width)
                                rootCol = deebo.methods.getColFrmClsList(col, "data-cell-")
                            } else {
                                if(!col.nextElementSibling && (e.offsetX > ((cBds.right-cBds.left)/2))){//last and grabbing the end of it
                                    rootCol = deebo.methods.getColFrmClsList(col, "data-cell-")
                                } else {
                                    rootCol = deebo.methods.getColFrmClsList(col.previousElementSibling, "data-cell-")
                                }
                            }
                            if(rootCol){
                                deebo.methods.currColumnEdit =rootCol
                                tblDragEvents.methods.colDragStartFrmCellTracker = { col: rootCol, row: null, xstart: useX, ystart:null, resized: false }
                                window.addEventListener("mouseup", tblDragEvents.methods.handleColResMouseUp)
                            }
                        }
                    }

                    if(clist.contains(rcls)){
                        deebo.methods.currColumnEdit = null
                        const elToUse = col.parentElement
                        tblDragEvents.methods.colDragStartFrmCellTracker = { col: null, row: elToUse, xstart: null, ystart: e.offsetY, resized: false }
                        window.addEventListener("mouseup", tblDragEvents.methods.handleColResMouseUp)
                    }
                }
                if(e.type === "mousemove"){
                    if(tblDragEvents.methods.colDragStartFrmCellTracker.col && deebo.methods.currColumnEdit === tblDragEvents.methods.colDragStartFrmCellTracker.col)
                        tblDragEvents.methods.doCellWidth(e)

                    if(tblDragEvents.methods.colDragStartFrmCellTracker.row && tblDragEvents.methods.colDragStartFrmCellTracker.ystart)
                        tblDragEvents.methods.doRowHeight(e)
                }
            },

            handleTableHeightAdjust: function(e) {
                const rcls = "moveable-row"
                const clist = e.target.classList
                if(e.type === "mousedown" && /data-table-footer/g.test(e.target.className)){
                    document.addEventListener("selectstart", tblDragEvents.methods.stopWindowSelection)
                    if(clist.contains(rcls)){
                        tblDragEvents.methods.tblDragStartFrmPagiTracker = { row: e.target, ystart: e.offsetY, resized: false }
                        window.addEventListener("mouseup", tblDragEvents.methods.handleColResMouseUp)
                    }
                }
                if(e.type === "mousemove"){
                    if(tblDragEvents.methods.tblDragStartFrmPagiTracker.row && tblDragEvents.methods.tblDragStartFrmPagiTracker.ystart)
                        tblDragEvents.methods.doTblHeight(e)
                }
            },

            doHeaderWidth: function(e) {
                try{
                    const head = document.getElementById("columnHeader" + tblDragEvents.methods.colDragStartFrmHeaderTracker.col)
                    const hbds = head?.getBoundingClientRect()
                    const useWid = e.pageX - (hbds.left+window.scrollX)
                    tblDragEvents.methods.colDragStartFrmHeaderTracker.resized = true
                    deebo.methods.updateUiColCellTheme("width", (Math.floor(Math.max(30, useWid)) + "px"))
                }catch(err){}
            },

            doHeaderHeight: function(e) {
                try{
                    const hdrs = document.querySelector(".col-header:not(.col-header-minimized)") || document.getElementById("dataTableHeaders")
                    const hdrbds = hdrs.getBoundingClientRect()
                    const useHgt= e.pageY - (hdrbds.top+window.scrollY)
                    tblDragEvents.methods.colDragStartFrmHeaderTracker.resized = true
                    deebo.methods.setSingleRowHgt(Math.floor(Math.max(30, useHgt)), document.getElementById("dataTableHeaders"), true)
                }catch(err){}
            },

            doCellWidth: function(e) {
                try{
                    const head = document.getElementById("columnHeader" + tblDragEvents.methods.colDragStartFrmCellTracker.col)//this looks outta place but is ok here
                    const useWid = e.pageX - (head.getBoundingClientRect().left+window.scrollX)
                    tblDragEvents.methods.colDragStartFrmCellTracker.resized = true
                    deebo.methods.updateUiColCellTheme("width", (Math.floor(Math.max(30, useWid)) + "px"))
                }catch(err){}
            },

            doRowHeight: function(e) {
                try{
                    const rowbds = tblDragEvents.methods.colDragStartFrmCellTracker.row.getBoundingClientRect()
                    const useHgt = e.pageY - (rowbds.top+window.scrollY)
                    tblDragEvents.methods.colDragStartFrmCellTracker.resized = true
                    deebo.methods.setSingleRowHgt(Math.floor(Math.max(30, useHgt)), tblDragEvents.methods.colDragStartFrmCellTracker.row, true)
                }catch(err){}
            },

            doTblHeight: function(e) {
                try{
                    const rowbds = tblDragEvents.methods.tblDragStartFrmPagiTracker.row.getBoundingClientRect()
                    const useHgt = e.pageY - (rowbds.bottom+window.scrollY)
                    tblDragEvents.methods.tblDragStartFrmPagiTracker.resized = true
                    let max = 1000
                    if(isNaN(max))
                        max = 700;
                    const tblWant = Math.min((deebo.methods.dTblHeight + useHgt), max);
                    deebo.methods.dTblHeight = Math.floor(Math.max(tblWant, 100))
                    deebo.methods.saveTheme({ target: { id: "desTblHeight", value: deebo.methods.dTblHeight } })//force this event
                    setTimeout( function() {
                        dataTableService.methods.setTableBounds()
                        if(!deebo.methods.showCharts){
                            const dtb = document.getElementById("dataTableBody")
                            dtb.scrollBy(0, 1)
                            setTimeout(function() { 
                                deebo.methods.setRowSelChecksPlacement()
                                dtb.scrollBy(0, -1)
                                dtb.scrollBy(0, 1)
                            })
                        }
                    })
                }catch(err){}
            },

            handleColResMouseUp: function(e) {
                try{ e && e.preventDefault() } catch(e) {}
                if(tblDragEvents.methods.colMoving)
                    return;
                window.removeEventListener("mouseup", tblDragEvents.methods.handleColResMouseUp)
                if(tblDragEvents.methods.colDragStartFrmHeaderTracker.ystart)
                    tblDragEvents.methods.doHeaderHeight(e)
                if(tblDragEvents.methods.colDragStartFrmCellTracker.ystart)
                    tblDragEvents.methods.doRowHeight(e)
                if(tblDragEvents.methods.colDragStartFrmHeaderTracker.col && deebo.methods.currColumnEdit === tblDragEvents.methods.colDragStartFrmHeaderTracker.col)
                    tblDragEvents.methods.doHeaderWidth(e)
                if(tblDragEvents.methods.colDragStartFrmCellTracker.col && deebo.methods.currColumnEdit === tblDragEvents.methods.colDragStartFrmCellTracker.col)
                    tblDragEvents.methods.doCellWidth(e)
                if(tblDragEvents.methods.tblDragStartFrmPagiTracker.ystart){
                    tblDragEvents.methods.doTblHeight(e)
                    document.removeEventListener("selectstart", tblDragEvents.methods.stopWindowSelection)
                }
                tblDragEvents.methods.didResizeOnEvent = (tblDragEvents.methods.colDragStartFrmCellTracker.resized || 
                    tblDragEvents.methods.colDragStartFrmHeaderTracker.resized || tblDragEvents.methods.tblDragStartFrmPagiTracker.resized)
                tblDragEvents.methods.colDragStartFrmHeaderTracker = { col: null, xstart: null, ystart: null, resized: false }
                tblDragEvents.methods.colDragStartFrmCellTracker = { col: null, row: null, xstart: null, ystart: null, resized: false }
                tblDragEvents.methods.tblDragStartFrmPagiTracker = { row: null, ystart: null, resized: false }
                if(window.getSelection)
                    window.getSelection().removeAllRanges();
                if(deebo.methods.currColumnEdit){
                    const prop = deebo.methods.replaceUniSep(deebo.methods.currColumnEdit)
                    if(dataTableService.methods.dataFilSrtTracker[prop] && dataTableService.methods.dataFilSrtTracker[prop].colWidth){
                        const useWid = Math.min(2500, (parseInt(dataTableService.methods.dataFilSrtTracker[prop].colWidth.replace(/[ ]?px/g, ""))))
                        deebo.methods.updateUiColCellTheme("width", (Math.floor(Math.max(50, useWid)) + "px")) 
                    }
                    deebo.methods.clearValidatedEdit()
                }
                setTimeout( function() { //let the click event process first
                    deebo.methods.currColumnEdit = null
                    tblDragEvents.methods.didResizeOnEvent = false 
                    if(window.getSelection)
                        window.getSelection().removeAllRanges();
                })
            },

            handleColResDblClick: function(e) {
                if(deebo.methods.currColumnEdit){
                    const prop = deebo.methods.replaceUniSep(deebo.methods.currColumnEdit)
                    if(dataTableService.methods.dataFilSrtTracker[prop]){
                        let i = 0
                        let wids = []
                        let useWid = 50
                        const els = document.getElementsByClassName("data-cell-" + deebo.methods.currColumnEdit)
                        const nw = els[0]?.getBoundingClientRect().width || 0
                        const len = els.length
                        for(i; i < len; i++)
                            wids.push(els[i].scrollWidth)
                        useWid =wids.sort()[(len-1)]
                        if(useWid && useWid > nw){
                            const cswid = Math.ceil(useWid+1) + "px"
                            deebo.methods.updateUiColCellTheme("width", cswid) 
                            document.getElementById("columnHeader" + deebo.methods.currColumnEdit).style.width = cswid
                        }
                    }
                }
            },

            handleColMoveMouseUp: function(e) {
                try{ e && e.preventDefault() } catch(e) {}
                if(tblDragEvents.methods.colMoving){
                    const isMUp = e && e.type === "mouseup";
                    if(isMUp){
                        window.removeEventListener("mouseup", tblDragEvents.methods.handleColMoveMouseUp)
                        tblDragEvents.methods.didResizeOnEvent = true
                        tblDragEvents.methods.colDragStartFrmHeaderTracker = { col: null, xstart: null, ystart: null, resized: false }
                    }
                    if(window.getSelection)
                        window.getSelection().removeAllRanges();
                    if(deebo.methods.currColumnEdit){
                        const colRef = document.getElementById("columnHeader" + deebo.methods.currColumnEdit)
                        let xDrop = e.clientX
                        let i = 0;
                        let lfts = []
                        let wantlfts = []
                        const cols = document.getElementsByClassName("col-header")
                        const len = cols.length
                        const nwColLft = Math.floor(colRef.getBoundingClientRect().left)
                        for(i; i < len; i++){
                            const col = cols[i]
                            if(!col.classList.contains("col-header-minimized")){
                                const elLft = Math.floor(col.getBoundingClientRect().left)
                                lfts.push(elLft)
                                if(col.id !== colRef.id)
                                    wantlfts.push(elLft)
                            }
                        }
                        wantlfts.push(xDrop)
                        wantlfts = wantlfts.sort( function(a, b) { return a-b })
                        if(lfts.length && lfts.length === wantlfts.length){
                            const dtH = document.getElementById("dataTableHeaders")
                            const wLf = wantlfts.indexOf(xDrop)
                            if(wLf != lfts.indexOf(nwColLft)){
                                const inAft = wLf - 1
                                const rmCol = dtH.removeChild(colRef)
                                if(inAft === -1){//they want it first
                                    dtH.insertAdjacentElement("afterbegin", rmCol)
                                } else {
                                    if(inAft >= (wantlfts.length - 2))//last
                                        dtH.appendChild(colRef)
                                    else{
                                        if(cols[inAft])
                                            cols[inAft].insertAdjacentElement("afterend", rmCol)
                                    }
                                }
                                const dtB = document.getElementById("dataTableBody")
                                const willSclTo = dtB.scrollLeft
                                setTimeout( function() {
                                    let i = 0
                                    deebo.methods.columnNames = []
                                    const els = document.getElementsByClassName("col-header")
                                    const len = els.length
                                    for(i; i < len; i++)
                                        deebo.methods.columnNames.push(deebo.methods.replaceUniSep(els[i].id.replace(/^columnHeader/, "")))
                                    deebo.methods.renderCurrData()
                                    tblDragEvents.methods.reinitBFrzOnReord(document.getElementsByClassName("col-header")[0])
                                    setTimeout( function() { dtB.scrollLeft = willSclTo })
                                })
                            }
                        }
                    }
                    if(isMUp){
                        setTimeout( function() { //let the click event process first
                            deebo.methods.currColumnEdit = null
                            tblDragEvents.methods.didResizeOnEvent = false
                            tblDragEvents.methods.colMoving = false
                        })
                    }
                    deebo.methods.clearValidatedEdit(null, true)
                }
            },

            reinitBFrzOnReord: function(div) {
                const nwBtnFz = document.getElementsByClassName("btn-freeze-col")[0]
                if(nwBtnFz && div && nwBtnFz.parentElement.id === div.id)//leave it alone
                    return;
                const useCol = div?.id.replace(/columnHeader/g, "")
                const btnMn = document.getElementById("btnMin" + useCol)
                nwBtnFz.parentElement.removeChild(nwBtnFz)
                if(div && btnMn && !document.getElementsByClassName("btn-freeze-col").length){
                    const btnfz = document.createElement("button")
                    btnfz.type = "button"
                    const ifz = document.createElement("i")
                    btnfz.id = "btnFreeze" + useCol;
                    btnfz.className = "btn-freeze-col"
                    ifz.className = "material-icons"
                    ifz.textContent = "featured_play_list"
                    btnfz.appendChild(ifz)
                    btnfz.onclick = deebo.methods.freezeColOnClick
                    deebo.methods.unbindMouseRemoveEvts(btnfz)
                    btnMn.insertAdjacentElement("afterend", btnfz)
                }
            },

            stopWindowSelection: function(e) {
                e.preventDefault()
                return false;
            },
        }

        return home
    }()
}()

document.addEventListener("DOMContentLoaded", function() {
    try{
        const tlFilt = document.getElementById("topLevelDataFilter")
        const btnReset = document.getElementById("btnReset")
        if(tlFilt){
            tlFilt.oninput = deebo.methods.filterOnKeyUp
            tlFilt.onkeyup = deebo.methods.filterOnKeyUp
        }
        if(btnReset)
            btnReset.addEventListener("click", deebo.methods.resetCurrentData)
        document.getElementById("btnXSelRows").addEventListener("click", deebo.methods.clearSelectedRows)
        document.getElementById("btnTogSelRows").addEventListener("click", deebo.methods.toggleSelectedRows)
        document.getElementById("btnExportCsv").addEventListener("click", deebo.methods.handleExportData)
        document.getElementById("btnExportPsv").addEventListener("click", deebo.methods.handleExportData)
        document.getElementById("btnExportTsv").addEventListener("click", deebo.methods.handleExportData)
        document.getElementById("btnExportJson").addEventListener("click", deebo.methods.handleExportData)
        document.getElementById("btnCharts").addEventListener("click", deebo.methods.displaySelectedInsights)
        document.getElementById("fCellDragger").addEventListener("focus", deebo.methods.focusCellDragger)
        document.getElementsByClassName("deebo-dd-contain")[0].addEventListener("click", deebo.methods.toggleExportOpts)
        window.addEventListener("resize", deebo.methods.cleanUpPieLayovers)
        window.addEventListener("resize", deebo.methods.clearValidatedEdit)
        window.addEventListener("scroll", deebo.methods.clearValidatedEdit)
    }catch(e){}
})