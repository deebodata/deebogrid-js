addEventListener('message', function({ data }) {
    // {id: someid, pk: primKey, main: dataTableService.methods.mainData, curr: dataTableService.methods.currFilData}
    if(data.pk || data.main){
        let i = 0
        let map = {}
        let sendBack = { id: data.id, map: {} }
        const clen = data.curr.length
        const findObjIndxInData = function(item) {
          try{
              if(data.pk)
                return data.main.indexOf( data.main.find( function(d) { return d[data.pk] === item[data.pk] }) )
              let i = 0; let eq = 0;
              const propLen = Object.keys(item).length
              const len = data.main?.length
              for(i; i < len; i++){
                  eq = 0
                  const mD = data.main[i]
                  for(const prop in item){
                      if(item[prop] === mD[prop])
                          eq += 1
                      if(eq === propLen)//they all equal
                          return i
                  }
              }
              return -1
          } catch(e) { return -1 }
      }
      const incr = 5000
      const withUpdates = clen > incr
      for(i; i < clen; i++){
        const item = data.curr[i]
        const index = findObjIndxInData(item)
        if(index > -1)
            map[i] = index
        if(withUpdates && (i%incr === 0)){
            sendBack.map = {...map}
            postMessage(sendBack);
        }
      }
      sendBack.map = {...map}
      postMessage(sendBack);
    } else {
        if(data.lineGraph){//{ lineGraph: grphCont.id, data: useData, uDates: (uDates || unqDates), stat: (stat || "avg") }
            function setUseableLgData(valArr, uDates, stat) {
                let d = 0;
                let useData = []
                const dlen = uDates.length
                for(d; d < dlen; d++){
                    let obj = {}
                    const dt = uDates[d]
                    const justVal = valArr.filter( function(d) {return d[("dtColumn")].getTime() === dt.getTime()}).map( function(d) {return d[("numColumn")]} )
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
                                obj = { dtColumn: dt, numColumn: findDataMedian(justVal, jlen) }
                                break;
                            case "mode":
                                obj = { dtColumn: dt, numColumn: findDataMode(justVal) }
                                break;
                            default: "avg"
                                obj = { dtColumn: dt, numColumn: (justVal.reduce( function(acc, curr) {return (acc += curr)} , 0)/jlen) };
                        }
                        useData.push(obj)
                    }
                }
                postMessage({ lineGraph: data.lineGraph, data: useData });
            }

            function findDataMedian(data, len) {
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
            }

            function getNumColumnValueCounts(data) {
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
            }

            function findDataMode(data) {
                const count = getNumColumnValueCounts(data)
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
            }

            setUseableLgData(data.data, data.uDates, data.stat)
        }
    }
});
