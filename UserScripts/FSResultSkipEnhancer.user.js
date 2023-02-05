// ==UserScript==
// @name        FSResultSkipEnhancer
// @namespace   https://twitter.com/11powder
// @description Skipボタンで結果ログが全部表示されるようにする
// @include     /^http:\/\/soraniwa\.428\.st\/fs\/result\/[^\/]+\.html$/
// @version     1.0.0
// @updateURL   https://pejuta.github.io/FSTools/UserScripts/FSResultSkipEnhancer.user.js
// @downloadURL https://pejuta.github.io/FSTools/UserScripts/FSResultSkipEnhancer.user.js
// @grant       none
// ==/UserScript==

(() => {
    function showSequences() {
        $(
`<style type='text/css'>
    .sequence{
        opacity: 1!important;
    }
</style>`
        ).appendTo("head");
    }

    $(document).on("click", "#closeScroll", () => {
        showSequences();
    })
})();
