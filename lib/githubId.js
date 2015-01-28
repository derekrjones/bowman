/*

"https://github.com/twbs/bootstrap.git" -> "twbs/bootstrap"

urls like:

http://github.com/twbs/bootstrap.git
https://github.com/twbs/bootstrap.git
//github.com/twbs/bootstrap.git
github.com/twbs/bootstrap.git

*/

module.exports = function(url){
    if(typeof url === 'string' && url.indexOf('github.com') !==-1 ){
        return url
            .toLowerCase()
            .replace(/^.*github\.com\//, "")
            .replace(/(\/|\.git)$/, "")
    }
}