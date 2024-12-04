let down = false;
document.addEventListener("mousedown", function(event) {
    down = true;
})

document.addEventListener("mouseup", function(event) {
    if (!down) {
        return false;
    }
    let selected = window.getSelection().toString();
    if (down && selected != '') {
        //get selected text and send request to bkgd page to create menu
        chrome.runtime.sendMessage({
            'message': 'updateContextMenu',
            'selection': true,
            'text': selected,
            'url': location.href
        });
        down = false;
    } 
}, true);

// document.addEventListener("mousedown", function(event) {
//     if (event.button !== 2) {
//         return false;
//     }
//     let selected = window.getSelection().toString();
//     if (event.button == 2 && selected != '') {
//         //get selected text and send request to bkgd page to create menu
//         chrome.runtime.sendMessage({
//             'message': 'updateContextMenu',
//             'selection': true,
//             'text': selected,
//             'url': location.href
//         });
//     } else {
//         chrome.runtime.sendMessage({
//             'message': 'updateContextMenu',
//             'selection': false,
//             'text': null,
//             'url': location.href
//         });
//     }
// }, true);