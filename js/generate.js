function generate() {
    let scoreboard = table.scoreboard
    let name_space = table.name_space
    let path = table.path
    let typeOfReward = table.type

    let name = path
    if (path) {
        if (path.indexOf(':')>0) {
            name = path.substring(path.lastIndexOf(':')+1)
        }
        if (path.indexOf('/')>0) {
            name = path.substring(path.lastIndexOf('/')+1)
        }
    }
    
    path = path.indexOf(':')>0 ? path : name_space+":"+path


    let items = table.items
    let arr
    if (items) arr = Object.keys(items)




    if (scoreboard && name_space && path && arr) {
        let logo = '#=================#\n#   Made by W3E   #\n#=================#\n\n'
        let main = mainFile(logo, items, scoreboard, path, typeOfReward) 
        let craft = craftFile(logo, items, scoreboard, path, typeOfReward)
        let fail = failFile(logo, items, scoreboard)

        var zip = new JSZip();
        let expansion = ".mcfunction"
        zip.folder(name).file("main" + expansion, main);
        zip.folder(name).file("craft" + expansion, craft);
        zip.folder(name).file("fail" + expansion, fail);
        zip.folder(name).file("save.json", $('#source').val());

        zip.generateAsync({type: "base64"}).then(function(content) {
            var link = document.createElement('a');
            link.href = "data:application/zip;base64," + content;
            link.download = name+".zip";
            link.click();
            link.remove();
        });
    }
}



function mainFile(str, items, scoreboard, path, typeOfReward) {
    str+='#(detect item\n'
    let sys = 0
    let itemId = ""
    for (arr in items) {
        sys++
        itemId = getId(arr, items)
        let nbt = items[arr].nbt ? items[arr].nbt : ""
        str += "execute store result score #"+sys+"_Count "+scoreboard+" run clear @s "+itemId+nbt+" 0\n"
    }
    str += "#)\n\n#(survival\nscoreboard players set #result "+scoreboard+" 0\n"+"execute if entity @s[gamemode=!creative] "
    for (let i=1; i<=arr; i++) {
        str += "if score #"+i+"_Count "+scoreboard+" matches "+items[arr].count+".. "
    }
    str += "run function "+path+"/craft\nexecute if entity @s[gamemode=!creative] if score #result "+scoreboard+" matches 0 run function "+path+"/fail\n#)\n\n#(creative\n"
    str += typeOfReward=='loot_table' ? "loot give @s[gamemode=creative] loot " : "execute if entity @s[gamemode=creative] at @s run function "

    str += path+"\nexecute if entity @s[gamemode=creative] run playsound minecraft:block.anvil.use master @a ~ ~ ~ 0.5 1.2\n#)"
    return str
}

function craftFile(str, items, scoreboard, path, typeOfReward) {
    str += 'playsound minecraft:block.anvil.use master @a ~ ~ ~ 0.5 1.2\n'
    let itemId = ""

    for (arr in items) {
        itemId = getId(arr, items)
        let nbt = items[arr].nbt ? items[arr].nbt : ""
        str += "clear @s "+itemId+nbt+" "+items[arr].count+"\n"
    }
    str += typeOfReward=='loot_table' ? "loot give @s loot " : "execute at @s run function "
    str+= path+"\nscoreboard players set #result "+scoreboard+" 1"
    return str
}

function failFile(str, items, scoreboard) {
    str+= "playsound minecraft:block.note_block.basedrum master @s ~ ~ ~ 1 0\ntellraw @s {\"translate\":\"core.table.failed\"}\n"
    let sys = 0

    for (arr in items) {
        nameOfItem = items[arr].name
        sys++
        itemId = getId(arr, items)
        str+="\n"
        let count = Number(items[arr].count)
        let translate = items[arr].translate? "translate" : "text"
        let typeOfItem = TypeOfItem(itemId)
        if (count == 1) {
            str += "execute if score #"+sys+"_Count "+scoreboard+" matches 0 run tellraw @s "
            str+= nameOfItem? "{\""+translate+"\":\""+nameOfItem+"\"}\n" : "\"translate\":\""+typeOfItem+".minecraft."+itemId+"\"}\n"
        } else {
            str+="scoreboard players remove #"+sys+"_Count "+scoreboard+" "+count+"\nscoreboard players operation #"+sys+"_Count "+scoreboard+" *= -1 CONST\nexecute if score #"+sys+"_Count "+scoreboard+" matches 1.. run tellraw @s "
            str+= nameOfItem? "[{\""+translate+"\":\""+nameOfItem+"\"},{\"text\":\" \"},{\"score\":{\"name\":\"#"+sys+"_Count\",\"objective\":\""+scoreboard+"\"}}]\n" : "[{\"translate\":\""+typeOfItem+".minecraft."+itemId+"\"},{\"text\":\" \"},{\"score\":{\"name\":\"#"+sys+"_Count\",\"objective\":\""+scoreboard+"\"}}]\n"
        }
    }
    return str
}

function getId(arr, items) {
    let itemId = items[arr].id
    if (itemId.indexOf("minecraft:")==0) {
        itemId = itemId.substring(10)
    }
    return itemId
}

function TypeOfItem(id) {
    let idList = collections.blockList
    let arr = idList.find(el => el == id)
    return arr? "block" : "item"
}









function getBlock() {
    let arr = [

    ]
    let str = ""
    let arr2 = []
    for (var index in arr) {
        if (arr[index].indexOf('block.minecraft.') == 0 && !arr[index].indexOf('block.minecraft.banner')==0) arr2.push(arr[index].substring(16))
    }
    arr2.sort()
    for (var index in arr2) {
        if (arr2[index].indexOf('.')==-1) str+="\""+arr2[index]+"\",\n"
    }

    downloadId(str)
}

function downloadId(text) {
    var blob = new Blob([text], {type:"text/plain"});
    
    var link = document.createElement('a');

    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download','массивы');
    link.click();
    link.remove();
}