function convertProxyUrl(url){
    if(!window.WebviewProxy){
        return url;
    }
    
    if(cordova.platformId === "android"){
        return url;
    }
    return window.WebviewProxy.convertProxyUrl(url);
}

export default convertProxyUrl;


