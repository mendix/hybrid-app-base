export function loadJSON(file, callback) {
    const request = new XMLHttpRequest();
    request.overrideMimeType("application/json");
    request.open('GET', file, true); // Replace 'my_data' with the path to your file
    request.onreadystatechange = function () {
        if (request.readyState === 4) {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(request.responseText);
        }
    };
    request.send(null);
}
