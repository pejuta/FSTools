// ==UserScript==
// @name        FSActionCharaSelector
// @namespace   https://twitter.com/11powder
// @description 童話画廊の各種行動画面のキャラ選択を便利にする
// @include     /^http:\/\/soraniwa\.428\.st\/fs\/?(?:\?mode=action)?/
// @version     1.0.0
// @updateURL   https://pejuta.github.io/FSTools/UserScripts/FSActionCharaSelector.user.js
// @downloadURL https://pejuta.github.io/FSTools/UserScripts/FSActionCharaSelector.user.js
// @grant       none
// ==/UserScript==

(async () => {
    const $targetSubtitle = $("h2.subtitle").filter((i, e) => e.innerHTML === "メインストーリー");
    if ($targetSubtitle.length === 0) {
        return;
    }

    function delay(ms) {
        return new Promise((resolve) => {
            setTimeout(() => resolve(), ms);
        });
    }

    const dataClassname = "charadata";
    const eqpClassname = "charaequipment";
    const skillsClassname = "charaskills";
    const singleSkillClassname = "charasingleskill";
    const docClassname_HiddenEffects = "hiddeneffects";
    const singleSkillClassname_NoCondition = "nocondition";
    const localStorageName_HiddenEffects = "FSActionCharaSelector_ShowNoSkillEffects";
    const CHARA_DL_DELAY_MS = 1000;

    const _vdoc = document.implementation.createHTMLDocument();
    const $inputEnos = $("#d1,#d2,#d3,#d4");

    // .charaframeselfに対してバインドしてはならない
    function toggleSelectedChara($target) {
        if (!$target.is(".charaframe,.charaframe2")) {
            return "notcharaframe";
        }

        const targetEno = $target.data("eno") + "";

        const $inputWithSameValue = $inputEnos.filter((i, e) => e.value === targetEno);
        const $firstEmptyInput = $inputEnos.filter((i, e) => e.value === "").first();
        if ($inputWithSameValue.length > 0) {
            $inputWithSameValue.each((i, e) => e.value = "");
        } else if ($firstEmptyInput.length > 0) {
            $firstEmptyInput.val(targetEno);
        } else {
            return "noemptyslot";
        }

        $target.toggleClass("charaframe").toggleClass("charaframe2");
        $target.find(".tubuyaki").toggleClass("inline");
        $target.find(".pin").toggleClass("block");

        return null;
    }

    function dataExists($target) {
        const $insertedData = $target.children("." + dataClassname);
        return $insertedData.length > 0;
    }

    // toggleSelectedCharaとともに呼ぶ順序によって結果が変わるため要注意
    // mode?: "show", "hide"
    async function toggleInsertedDataOfSelectedChara($target, mode) {
        if (!$target.is(".charaframe,.charaframe2")) {
            // .charaframe2 は .charaframeself のブロックにも付与されている
            return "notcharaframe";
        }

        const targetEno = $target.data("eno") + "";

        const $insertedData = $target.children("." + dataClassname);
        if ($insertedData.length > 0) {
            if (mode === "show") {
                $insertedData.show();
            } else if (mode === "hide") {
                $insertedData.hide();
            } else {
                $insertedData.toggle();
            }
            return null;
        }
        else if (mode === "hide") {
            return null;
        }
        else if ($target.is(".charaframe")) {
            // キャラは選択されているがスキル情報は出ていない状態だった
            // スキル情報ロード失敗時などの後にここに来るが、あくまで正常な処理の範疇
            return null;
        }

        const $skills = await $fetchThenInsertSkills(targetEno, $target);
        processCharaSkillsAfterInsertion($skills);

        return null;
    }

    async function $fetchThenInsertSkills(targetEno, $targetChara) {
        const res = await fetch(`http://soraniwa.428.st/fs/?mode=profile&eno=${targetEno}`);
        if (!res.ok) {
            $targetChara.append(`<div class="${skillsClassname + "err"}">スキル一覧の取得に失敗しました。</div>`);
            setTimeout(() => $targetChara.find($("." + skillsClassname + "err")).remove(), 3000);
            return "failedloading";
        }

        const html = await res.text();
        const $dataContainer = $(`<div class="${dataClassname}"/>`).appendTo($targetChara);
        const $skills = $(`<div class="${skillsClassname}"/>`).append($(html, _vdoc).find("#modal3 .framearea > div:eq(1)").children()).appendTo($dataContainer);
        return $skills;
    }

    function hideAllInsertedData() {
        $("." + dataClassname).hide()
                              .closest(".charaframe")
                              .find(".tubuyaki").toggleClass("inline").end()
                              .find(".pin").toggleClass("block");
    }

    function processCharaSkillsAfterInsertion($skills) {
        $skills.prepend("<hr class='dashline'>");

        $skills.find("span.marks.marki0").each((i, e) => {
            $(e).nextUntil("hr.dashline").andSelf().wrapAll(`<span class="${singleSkillClassname}"/>`);
        });

        $skills.find("span.marks.marki0+span+span+small>b:empty").each((i, e) => {
            $(e).parent().next("br").next("small").children("span:nth-child(3)").css("opacity", "0.6");
        }).closest("." + singleSkillClassname).addClass(singleSkillClassname_NoCondition);
    }

    // [target1, target2, ...]
    async function toggleDataSkillsOfSelectedCharasDelayed(targetArray, mode) {
        let i = 0;
        const iEnd = targetArray.length;
        for (let target of targetArray) {
            const $target = $(target);
            let needsToDownload = !(dataExists($target) || mode === "hide");

            // ロード失敗でもディレイ挟んで継続
            await toggleInsertedDataOfSelectedChara($target, mode);

            if (!needsToDownload) {
                continue;
            }

            if (++i === iEnd) {
                return;
            }
            await delay(CHARA_DL_DELAY_MS);
        }
    }

    function enableToggleOfSkillEffects() {
        const $button = $("<span class='sbbutton' style='margin-top:4px;'/>").appendTo($(".charaframe2.charaframeself").prev("p"));
        const toOnText = "スキル効果を表示する";
        const toOffText = "スキル効果の表示を消す";

        if (localStorage.getItem(localStorageName_HiddenEffects)) {
            $button.html(toOnText);
            $(document.body).addClass(docClassname_HiddenEffects);
        } else {
            $button.html(toOffText);
        }

        $button.on("click", () => {
            $(document.body).toggleClass(docClassname_HiddenEffects);
            if (localStorage.getItem(localStorageName_HiddenEffects)) {
                localStorage.removeItem(localStorageName_HiddenEffects);
                $button.html(toOffText);
            } else {
                localStorage.setItem(localStorageName_HiddenEffects, "1");
                $button.html(toOnText);
            }
        });
    }

    let processingEvent = false;
    $("head").append(`
<style type="text/css">
    .block{display:block!important;}
    .inline{display:inline!important;}
    .${skillsClassname}{font-size:small;line-height:1.2;}
    .${skillsClassname} span.marks.marki0{width:2em;}
    .${skillsClassname} span.marks.marki0+span>span{display:inline-block;}
    .${skillsClassname} span.marks.marki0+span+span{width:calc(10em + 4px)!important;}
    .${docClassname_HiddenEffects} .${skillsClassname} br:nth-last-of-type(2){display:none;}
    .${skillsClassname} small:nth-last-of-type(1){display:inline-block;padding-left:calc(2em + 4px);}
    .${docClassname_HiddenEffects} .${skillsClassname} small:nth-last-of-type(1){display:none;}
    .${skillsClassname} small:nth-last-of-type(1)>span:first-child{padding-left:0!important;}
    .${singleSkillClassname_NoCondition}{opacity:0.6;}
    .sbbutton{
        display: inline-block;
        padding: 5px;
        padding-left: 16px;
        padding-right: 16px;
        border: 1px #999999 solid;
        border-radius: 2px;
        background-color: #5577cc;
        box-shadow: 0px 2px 2px rgb(0 10 20 / 80%);
        color: #ffffff;
        font-weight: bold;
        cursor: pointer;
    }
    .sbbutton:hover{
        background-color: #e0dd90;
    }
</style>`);
    $(".charaframe").each((i, e) => e.outerHTML = e.outerHTML /* erasing events */);
    $(".charaframe").on("click", async function() {
        if (processingEvent) return;
        processingEvent = true;
        try {
            if (toggleSelectedChara($(this))) return;

            if (await toggleInsertedDataOfSelectedChara($(this))) return;
        }
        finally {
            processingEvent = false;
        }
    });
    $(".charaframeself").on("click", async function() {
        if (processingEvent) return;
        processingEvent = true;
        try {
            if (await toggleInsertedDataOfSelectedChara($(this))) return;
        }
        finally {
            processingEvent = false;
        }
    });
    $("#memberreset").on("click", function() {
        hideAllInsertedData();
    });
    enableToggleOfSkillEffects();
})();
