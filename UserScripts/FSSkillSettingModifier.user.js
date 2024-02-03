// ==UserScript==
// @name        FSSkillSettingModifier
// @namespace   https://twitter.com/11powder
// @description 童話画廊の戦闘設定を快適にする
// @include     /^https:\/\/soraniwa\.428\.st\/fs\/?(?:\?mode=battle(&.*)?)?$/
// @version     1.1.9
// @updateURL   https://dl.dropboxusercontent.com/s/mz1ukxbbrzb0wls/FSSkillSettingModifier.user.js
// @downloadURL https://dl.dropboxusercontent.com/s/mz1ukxbbrzb0wls/FSSkillSettingModifier.user.js
// @grant       none
// ==/UserScript==

(() => {
    "use strict";

    class Delayer {
        setDelay(func, delayMS, /* ...args: any[] */) {
            if (this.id) {
                clearTimeout(this.id);
            }
            this.id = setTimeout((argArray) => {
                this.id = 0;
                func.apply(null, argArray);
            }, delayMS, Array.prototype.slice.call(arguments, 2));
        }
    }

    class SkillSelectChaser {
        static init() {
            $("<style type='text/css'/>").html(`
    .skillnamelabel {
        padding-left: 8px;
    }
    .skillnamelabel > span:first-child {
        margin-left: -8px;
    }
`).appendTo("head");
        }

        constructor($select) {
            this.$select = $select;
        }

        enable() {
            $("input.swap").on("click", (e) => {
                this.keepSkillSelectedWhenSwap($(e.currentTarget));
            });
            this.insertSkillNameLabelAfterSelect();

            this.delayer = new Delayer();
        }

        keepSkillSelectedWhenSwap($swapButton) {
            const selectVal = this.$select.val();
            if (!selectVal) {
                return;
            }

            const index = $swapButton.data("index");
            if (selectVal === index.toString()) {
                // to downward
                this.$select.val((index + 1).toString());
            } else if (selectVal === (index + 1).toString()) {
                // to upward
                this.$select.val(index.toString());
            }
        }

        insertSkillNameLabelAfterSelect() {
            const $label = $("<span class='skillnamelabel'/>").insertAfter(this.$select);

            this.$select.on("change", (e) => {
                const strIndex = $(e.currentTarget).val();
                if (!strIndex) {
                    this.updateSkillLabel($label);
                } else {
                    const $connectSkill = $("select.selskill").eq(parseInt(strIndex, 10) - 1);
                    this.updateSkillLabel($label, $connectSkill);
                }
            });

            $("select.selskill").on("change", (e) => {
                this.delayer.setDelay(() => {
                    const strIndex = this.$select.val();
                    if (!strIndex) {
                        return;
                    }
                    const $connectSkill = $("select.selskill").eq(parseInt(strIndex, 10) - 1);
                    if ($connectSkill.is(e.currentTarget)) {
                        this.updateSkillLabel($label, $connectSkill);
                    }
                }, 150);
            });

            this.$select.each((i, e) => {
                e.dispatchEvent(new Event("change"));
            });
        }

        updateSkillLabel($label, /* optional */ $skillSelect) {
            if (!$skillSelect) {
                $label.html("");
                return;
            }
            const skillId = $skillSelect.val();
            const $type = $(`#type${skillId}`);
            if ($type.length !== 1) {
                $label.html("");
                return;
            }
            const $nameAndProp = $type.next("td");
            if ($nameAndProp.length !== 1) {
                return;
            }

            $label.html(`${$type.html().trim()}${$nameAndProp.html().trim()}`);
        }
    }

    const SKILL_ITEM_CLASSNAME = "skillitem";
    const SKILL_ITEM_TOGGLE_CLASSNAME = "skilltglbtn";
    class TogglableSkillsWrapper {
        static init() {
            $(document.head).append(
                `<style type="text/css">
    .${SKILL_ITEM_CLASSNAME} {
        position: relative;
    }

    .${SKILL_ITEM_CLASSNAME} > .${SKILL_ITEM_TOGGLE_CLASSNAME}:after {
        content: "セリフ▼";
        position: absolute;
        z-index: 1;
        visibility: hidden;
        opacity: 0;
        transition: visibility 0s, opacity 0.1s linear;
        display: block;
        top: 0;
        right: 10px;
        padding: 3px 6px;
        margin: 2px;
        border: 1px #997722 solid;
        border-radius: 3px;
        background-color: #ffdd66;
        color: #774400;
        font-weight: bold;
        cursor: pointer;
    }

    .${SKILL_ITEM_CLASSNAME}:hover > .${SKILL_ITEM_TOGGLE_CLASSNAME}:after {
        visibility: visible;
        opacity: 1;
    }

    .${SKILL_ITEM_CLASSNAME} > .skilldesc {
        vertical-align: bottom;
    }

    .${SKILL_ITEM_CLASSNAME}.serifactive > .${SKILL_ITEM_TOGGLE_CLASSNAME}:after {
        content: "セリフ▲";
    }

    .skillserif {
        display: block!important;
        max-height: 0;
        overflow: hidden;
        opacity: 0;
        transition: opacity 0.3s linear, max-height 0s;
    }

    .${SKILL_ITEM_CLASSNAME}.serifactive > .skillserif {
        max-height: none;
        opacity: 1;
    }

    .${SKILL_ITEM_CLASSNAME} > .marks.marki0 {
        background-color: rgb(255 255 255 / 25%);
    }
</style>`);

            // enabling toggle buttons
            $(document).on("click", `.${SKILL_ITEM_TOGGLE_CLASSNAME}`, function (e) {
                $(this).parent(/* "." + SKILL_ITEM_CLASSNAME */).toggleClass("serifactive");
            });

            // overwriting default toggle event
            let selifIsVisible = false;
            $("#skillseriftoggle").off("click").on("click", function () {
                if (selifIsVisible) {
                    $(`.${SKILL_ITEM_CLASSNAME}`).removeClass("serifactive");
                } else {
                    $(`.${SKILL_ITEM_CLASSNAME}`).addClass("serifactive");
                }
                selifIsVisible = !selifIsVisible;
            });
        }

        constructor($container) {
            this.$container = $container;
        }

        enable() {
            this.$container.css("position", "relative").children(".draggable-item.ui-sortable-handle").addClass(SKILL_ITEM_CLASSNAME);
            $("." + SKILL_ITEM_CLASSNAME).each((i, e) => {
                $(`<div class="${SKILL_ITEM_TOGGLE_CLASSNAME}"/>`).appendTo(e);
                e.dataset.index = i + 1;
            });
        }
    }

    class SortableSkills extends TogglableSkillsWrapper {
        static init() {
            super.init();
        }

        constructor($container) {
            super($container);
        }

        enable() {
            super.enable();
            this.$container.on("sortupdate", (e) => {
                this.resetIndexOfSkills();
            });
        }

        resetIndexOfSkills() {
            const $skills = $("." + SKILL_ITEM_CLASSNAME);
            this.triggerConnectChange($skills);
            this.resetDataIndex($skills);
        }

        triggerConnectChange($skills) {
            const $connectno = $("select[name='connectno']");
            const connectVal = $connectno.val();
            for (let i = 1; i <= $skills.length; i++) {
                const $skill = $skills.eq(i - 1);
                const prevIndex = $skill.data("index")
                if (prevIndex === i) {
                    continue;
                }
                if (connectVal === prevIndex.toString()) {
                    $connectno.val(i);
                    $connectno[0].dispatchEvent(new Event("change"));
                }
            }
        }

        resetDataIndex($skills) {
            for (let i = 1; i <= $skills.length; i++) {
                const $skill = $skills.eq(i - 1);
                $skill.attr("data-index", i);
                $skill.data("index", i);
            }
        }
    }

    const MAX_SHOWN_ON_SELECT = 20;
    const HEIGHT_OF_OPTION_ON_SELECT_PX = 20;
    const SKILL_SELECT_WIDTH_CORRECTION_PX = 5;

    class SearchableSelect {
        static init() {
            $(document.head).append(
                `<style type="text/css">
.searchableselect {
    position: relative;
    display: inline-flex;
    margin: 1px;
    vertical-align: bottom;
}

.searchableselect_sel {
    display: inline-block;
    position: relative;
    -webkit-writing-mode: horizontal-tb !important;
    color: black;
    text-rendering: auto;
    letter-spacing: normal;
    word-spacing: normal;
    text-transform: none;
    text-indent: 0px;
    text-shadow: none;
    text-align: start;
    appearance: auto;
    white-space: pre;
    -webkit-rtl-ordering: logical;
    cursor: default;
    font: 400 13.3333px Arial;
}

.searchableselect_btn:before {
    content: "";
    position: absolute;
    z-index: 2;
    right: 0;
    display: block;
    width: 24px;
    height: 100%;
    background-position: center;
    background-repeat: no-repeat;
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAGAQMAAADAPp2FAAAABlBMVEUAAAAAAAClZ7nPAAAAAXRSTlMAQObYZgAAABpJREFUeF5jcGhgeHiAobiBwZ6BQY6BgYcBAC73A75PxC48AAAAAElFTkSuQmCC);
}

.searchableselect_sel > .searchableselect_val,
.searchableselect_sel > .searchableselect_pls {
    height: 100%;
    width: 100%;
    margin: 0;
    padding: 0;
    border: 1px #669966 solid;
    background-color: white;
    border-radius: 2px;
    box-sizing: border-box;
}


.searchableselect_sel > .searchableselect_val {
    opacity: 0;
}

.searchableselect_sel > .searchableselect_val:focus {
    padding-left: 8px;
    position: relative;
    opacity: 1;
    z-index: 1
}

.searchableselect_sel > .searchableselect_pls {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding-left: 0px;
}

.searchableselect_sel > .searchableselect_pls.error {
    background-color: #ffbbbb;
}

.searchableselect_sel > .searchableselect_val::placeholder {
    color: black;
}

.searchableselect_sel > ul {
    position: relative;
    display: none;
    z-index: 3;
    overflow-x: hidden;
    overflow-y: scroll;
    background-color: white;
    color: black;
    border: #767676 solid 1px;
    max-height: calc(${HEIGHT_OF_OPTION_ON_SELECT_PX}px * ${MAX_SHOWN_ON_SELECT});
    list-style-type: none;
    padding-inline-start: 0;
    margin-block-start:  0;
    margin-block-end: 0;
}

.searchableselect_sel.active > ul {
    display: block;
}

.searchableselect_sel > ul > li {
    height: 20px;
    padding-left: 0px;
    text-align: inherit;
}

.searchableselect_sel > ul > li.marked {
    background-color: #ffeebb;
}

.searchableselect_sel > ul > li:hover {
    color: white;
    background-color: #4b89fc;
}

.searchableselect_sel > ul > li:hover > span:nth-of-type(3) {
    color: white!important;
}

.searchableselect_sel.active > ul {
    box-shadow: 0px 5px 10px rgb(0 0 0 / 20%);
}

.searchableselect_sel.active > ul > li {
    font-weight: normal;
    white-space: nowrap;
    min-height: 1.2em;
    padding: 0px 2px 1px;
}


.searchableselect_sel .marks.marki0 {
    width: 2.67em;
    margin-right: 1px;
    background-color: #229911;
}

.searchableselect_sel .marks.marki0.stepskill {
    background-color: #ccaa33;
}

.searchableselect_sel .marks.marki0.autoskill {
    background-color: #dd5757;
}

.ticon {
    display: inline-block;
    vertical-align: top;
    height: 20px;
}
.ticon:before {
    display: inline-block;
    content: "";
    width: 20px;
    height: 20px;
    background-size: 22px 22px;
    background-position: center;
    background-repeat: no-repeat;
}
.searchableselect_sel .type {
    padding-left: 0;
    padding-right: 0;
    margin: 0 2px 0 1px;
}
.searchableselect_sel .ticon.type {
    background-color: transparent;
    text-shadow: initial;
    border: initial;
    border-radius: initial;
}
.searchableselect_sel .cshigh {
    color: inherit;
}
.searchableselect_sel .cshigh:before {
    display: inline-block;
    content: "🔒";
}
.searchableselect .ticon.type+span {
    color: #11aa11!important;
}
.searchableselect_pls .ticon {
    height: 24px;
}
.searchableselect_pls .ticon:before {
    width: 24px;
    height: 24px;
    background-size: 30px 30px;
}
`                + Array.from({ length: 40 }, (_, i) => i + 1).map((n) => `.ticon.type${n}:before {background-image: url(./img/type/${n}.png);}`).join("\r\n") +
                `</style>`);

            $("div.divp").parent().css("overflow", "clip visible");
        }

        constructor($baseSelects) {
            this.$baseSelects = $baseSelects;

            this.$ul = SearchableSelect.$buildSkillList(this.$baseSelects);

            this.$ul.on("click", "li", (e) => {
                this.applySelected(e.currentTarget);
                const $sel = $(e.currentTarget).closest(".searchableselect_sel");
                this.deactivateSelect($sel);
            });
            this.searchEvtDelayer = new Delayer();
            this.rescanDelayer = new Delayer();
        }

        applySelected(li) {
            const $searchable = $(li).closest(".searchableselect");
            const index = this.$searchables.index($searchable);
            const $baseSelect = $searchable.next();
            $baseSelect.val($(li).data("skillid"));
            $baseSelect[0].dispatchEvent(new Event("change"));
            this.rescan(index, true);
        }

        rescan(index /* 0 based */, /* optional */ updateMarks) {
            updateMarks = typeof (updateMarks) === "undefined" ? true : updateMarks;

            if (!this.$baseSelects.length) {
                return;
            }

            const target = this.$baseSelects.get(index);
            const skillIdx = this.idToIndexhash.hasOwnProperty(target.value) ? this.idToIndexhash[target.value] : -1;
            const $li = this.$ul.children().eq(skillIdx);

            this.$sels.get(index).dataset.index = skillIdx;
            this.$vals.eq(index).attr("title", $li.attr("title") || "");

            const $pls = this.$pls.eq(index);
            $pls.html($li.html());
            if ($li.hasClass("error")) {
                $pls.addClass("error");
            } else {
                $pls.removeClass("error");
            }

            if (updateMarks) {
                this.markAllSetSkillsOnList();
                this.markAllSetSameSkillError();
            }
        }

        rescanAll() {
            if (!this.$baseSelects.length) {
                return;
            }

            for (let index = 0; index < this.$baseSelects.length; index++) {
                this.rescan(index, false);
            }

            this.markAllSetSkillsOnList();
            this.markAllSetSameSkillError();
        }

        enable() {
            this.$searchables = this.$baseSelects.before("<div class='searchableselect'><div class='searchableselect_btn'></div><div class='searchableselect_sel'><div class='searchableselect_pls'></div><input type='text' class='searchableselect_val'></div></div>").prev();
            this.$sels = this.$searchables.children(".searchableselect_sel");
            this.$vals = this.$sels.children(".searchableselect_val");
            this.$btns = this.$searchables.children(".searchableselect_btn");
            this.$pls = this.$sels.children(".searchableselect_pls");

            this.$sels.eq(0).append(this.$ul);
            this.idToIndexhash = {};
            this.$ul.children().each((i, e) => {
                this.idToIndexhash[e.dataset.skillid] = i;
            });
            this.$ul[0].style.display = "inline-block"; // for width
            this.$sels.css({
                height: this.$baseSelects.outerHeight(),
                width: this.$ul.width() + SKILL_SELECT_WIDTH_CORRECTION_PX,
            });
            this.$ul[0].style.display = "";

            this.$btns.on("click", (e) => {
                this.toggleSelect($(e.currentTarget).next());
            });

            this.$vals.on("focusin", (e) => {
                this.deactivateSelect($(".searchableselect_sel.active"));
                this.activateSelect($(e.currentTarget).parent());
            }).on("keydown", (e) => {
                if (e.keyCode === 13 /* enter */) {
                    e.preventDefault();
                }
            }).on("keyup", (evt) => {
                this.searchEvtDelayer.setDelay((elem) => this.execFiltering(elem), 150, evt.currentTarget);
            });

            $(document).on("click", (e) => {
                if (!$(e.target).closest(".searchableselect").length) {
                    this.deactivateSelect($(".searchableselect_sel.active"));
                }
            });

            this.$baseSelects.hide().on("change", (e) => {
                this.rescanDelayer.setDelay(() => this.rescanAll(), 150);
            });

            $(".swap").on("click", (e) => {
                const sindex = $(e.currentTarget).data("index");

                for (let i = 0; i < 2; i++) {
                    const $searchable = $(`#skill${sindex + i}.selskill`).prev(".searchableselect");
                    const index = this.$searchables.index($searchable);
                    this.rescan(index, false);
                }
            });

            this.rescanAll();
        }

        static $buildSkillList($baseSelects) {
            const baseIds = $baseSelects.eq(0).children("option").map((_, e) => e.value + "").get();
            const baseIdSet = new Set(baseIds);

            const lisHtml = $("table#skill tr").slice(0).map((i, e) => {
                if (i === 0) {
                    return `<li data-skillid="0" data-placeholder="(0) --設定なし--"><span class="marks marki0">0</span><span>　</span>--設定なし--</li>`;
                }

                const $tds = $(e).children("td");
                const skillid = $tds.eq(1).attr("id").substr(4);
                if (!baseIdSet.has(skillid)) {
                    return null; // must exclude later
                }

                let typeName = "";
                let typeHtml = "<i class='ticon'></i>";
                let skillProp = "[通常]";
                if (!$tds.eq(1).children().eq(1).hasClass("typen")) {
                    typeName = $tds.eq(1).children().eq(1).text().substr(1, 2);
                    typeHtml = `<i class="ticon ${$tds.eq(1).children()[1].className}" title="${typeName}"></i>`;
                    skillProp = $tds.eq(2).children("span:first").html();
                }
                const isLocked = $tds.eq(2).find(".cshigh").length > 0;

                const $hoverDesc = $tds.eq(3).children(".skillhoverdesc");
                const isStep = $hoverDesc.children("span:first").html() === "【S】";
                const isAuto = $hoverDesc.contents().eq(1).text().startsWith("自動:");
                if (skillid === "120") {
                    skillid;
                }
                const skillDesc = $hoverDesc.contents().eq(1).text();

                const $index = $tds.eq(0).clone();
                if (isStep) {
                    $index.children(".marks.marki0").addClass("stepskill");
                }
                if (isAuto) {
                    $index.children(".marks.marki0").addClass("autoskill");
                }
                const skillNameHTML = $tds.eq(2).html();
                const innerHTML = $index.html() + typeHtml + skillNameHTML;

                const skillNum = $tds.eq(0).children(".marks.marki0").html() || "";
                const skillName = $tds.eq(2).text();
                const skillUsableCount = $tds.eq(4).text();
                const queryTarget = `(${skillNum})${typeName ? `<${typeName}>` : ""}${isLocked ? "🔒" : ""}${skillName}${isAuto ? "[自動][AUTO]" : ""}${isStep ? "[ステップ][STEP]" : ""}[${skillUsableCount}]${skillDesc}`;
                const placeholder = `(${skillNum})${typeName ? `<${typeName}>` : ""}${isLocked ? "🔒" : ""}${skillName}`;

                return `<li title="${$hoverDesc.text()}" data-skillid="${skillid}" data-querytarget="${queryTarget}" data-placeholder="${placeholder}" data-snum="${skillNum}" data-stype="${typeName}" data-sprop="${skillProp}" data-sname="${skillName}" data-islocked="${isLocked}" data-isstep="${isStep}" data-isauto="${isAuto}" data-scount="${skillUsableCount}">${innerHTML}</li>`;
            }).get()
                .filter((e) => e) // excluding nulls
                .join("");

            return $(`<ul>${lisHtml}</ul>`);
        }

        markAllSetSkillsOnList() {
            const $lis = this.$ul.children().removeClass("marked");
            this.$sels.each((i, e) => {
                if (e.dataset.index === "0") {
                    return;
                }
                $lis.eq(parseInt(e.dataset.index, 10)).addClass("marked");
            });
        }

        markAllSetSameSkillError() {
            const $lis = this.$ul.children().removeClass("error");
            const hash = {};
            this.$sels.each((i, e) => {
                if (e.dataset.index === "0") {
                    this.$pls.eq(i).removeClass("error");
                    return;
                }

                if (e.dataset.index in hash) {
                    this.$pls.eq(i).addClass("error");
                    this.$pls.eq(hash[e.dataset.index]).addClass("error");
                    $lis.eq(parseInt(e.dataset.index, 10)).addClass("error");
                } else {
                    this.$pls.eq(i).removeClass("error");
                }
                hash[e.dataset.index] = i;
            });
        }

        execFiltering(input) {
            if (!input) {
                return;
            }

            const val = input.value;
            if (!val) {
                this.$ul.children().show();
                return;
            }

            const queryArray = val.split(/[\s+,]/g).filter((q) => q).map((q) => q.toUpperCase()); // remove first or last empty if any

            this.$ul.children().each((i, e) => {
                const queryTarget = e.dataset.querytarget?.toUpperCase() || "";
                if (queryArray.every((q) => queryTarget.indexOf(q) !== -1)) {
                    e.style.display = "";
                } else {
                    e.style.display = "none";
                }
            });
        }

        clearFilter() {
            this.$ul.children().show();
        }

        toggleSelect($sel) {
            if ($sel.hasClass("active")) {
                this.deactivateSelect($sel);
            } else {
                this.activateSelect($sel);
            }
        }

        activateSelect($sel) {
            if ($sel.hasClass("active")) {
                return;
            }
            $sel.addClass("active");

            $sel.append(this.$ul);
            const index = $sel[0].dataset.index;
            if (index === "-1") {
                return;
            }

            this.clearFilter();
            const $activeLi = this.$ul.children("li").eq(index);
            const top = index < MAX_SHOWN_ON_SELECT ? 0 : (index - MAX_SHOWN_ON_SELECT + 2) * (HEIGHT_OF_OPTION_ON_SELECT_PX + 1);
            this.$ul.scrollTop(top);

            $sel.find(".searchableselect_val").attr("placeholder", $activeLi.data("placeholder"));
        }

        deactivateSelect($sel) {
            if (!$sel.hasClass("active")) {
                return;
            }
            $sel.find(".searchableselect_val").val("").attr("placeholder", "");
            $sel.removeClass("active");
        }
    }

    class SkillListMarker {
        static init() {

            $(document.head).append(
                `<style type="text/css">
.itemlist tr.marked > td:nth-of-type(3) {
    font-weight: bold;
}
.itemlist tr.marked .marks.marki0 {
    /* background-color: #bb0000; */
}
.itemlist tr.marked.odd {
    background-color: rgb(255 255 223 /30%);
}
.itemlist tr.marked.even {
    background-color: rgb(255 255 223 /30%);
}
</style>`);
        }

        constructor($table) {
            this.$table = $table;
        }

        enable($selects) {
            if (!this.$table || this.$table.length === 0) {
                return;
            }

            if (!$selects || $selects.length === 0) {
                return;
            }

            this.delayer = new Delayer();

            this.$table.find("tr").slice(1).each((i, e) => {
                const typeTd = $(e).children("td").get(1);
                if (!typeTd) {
                    return;
                }
                e.dataset.sid = typeTd.id.substr(4);
            });
            $selects.on("change", (_) => {
                this.delayer.setDelay(() => {
                    this.update($selects);
                }, 150);
            });

            this.update($selects);
        }

        update($selects) {
            if (!$selects || $selects.length === 0) {
                return;
            }

            const selectedSids = new Set($selects.map((i, e) => {
                return e.value
            }).get());

            this.$table.find("tr").slice(1).removeClass("marked").each((i, e) => {
                const sid = e.dataset.sid;
                if (selectedSids.has(sid)) {
                    e.classList.add("marked");
                }
            });
        }
    }

    const MAINTYPE_TYPEBONUS_COUNT = 5;
    const SUBTYPE_REQUIREDBONUS_COUNT = 3;
    class SkillTypeCounter {
        static init() {
            $(document.head).append(
                `<style type="text/css">
.skilltypeinfo > p {
    margin: 4px 10px;
    padding-left: 4px;
    background: linear-gradient(to right, rgba(255, 255, 255, 0.25) 40%, transparent, transparent);
    border-radius: 3px;
}
.skilltypeinfo i, .skilltypeinfo span {
    background-color:transparent;
}
</style>`);
        }

        constructor() {
        }

        enable($insertBefore) {
            this.$info = $("<div class='skilltypeinfo'/>").insertBefore($insertBefore);
            //this.$triggeredTypes = $("<p class='skilltypemain'/>").appendTo(this.$info);
            this.$subtypes = $("<p class='skilltypesub'/>").appendTo(this.$info);

            this.delayer = new Delayer();

            $(".selskill").add($("#s_type")).on("change", (e) => {
                this.delayer.setDelay(() => {
                    this.update();
                }, 100);
            });
            this.update();
        }

        buildSubtypeCountsObj() {
            const typeCountsObj = {};
            $(".selskill").each((i, e) => {
                const skillId = $(e).val();
                const $stype = $("#type" + skillId);
                if (!$stype.children().length) {
                    return;
                }
                const className = $stype.children().eq(1).attr("class").slice(0, -5); // removing ' type'
                typeCountsObj[className] = 1 + (typeCountsObj[className] ?? 0);
            });

            return typeCountsObj;
        }

        update() {
            const typeBonusCountsObj = this.buildSubtypeCountsObj();
            const mainTypeCls = this.getSelectedMainTypeClass();
            if (mainTypeCls) {
                typeBonusCountsObj[mainTypeCls] = MAINTYPE_TYPEBONUS_COUNT + (typeBonusCountsObj[mainTypeCls] ?? 0);
            }

            const typeList = [];
            for (let cls in typeBonusCountsObj) {
                typeList.push({ cls, count: typeBonusCountsObj[cls] });
            }
            typeList.sort((a, b) => b.count - a.count); // descending

            const triggeredTypes = [];
            let stepHTML = "★スキルタイプ：<span>";
            for (let typ of typeList) {
                const typeCountHtml = typ.count >= SUBTYPE_REQUIREDBONUS_COUNT ? `<b>×<span>${typeBonusCountsObj[typ.cls]}</span></b>` : `×<span>${typeBonusCountsObj[typ.cls]}</span>`;
                stepHTML += `<span class="${typ.cls}"><i class="ticon ${typ.cls}"></i>${typeCountHtml}</span> `;
                if (typ.count >= SUBTYPE_REQUIREDBONUS_COUNT) {
                    triggeredTypes.push(typ.cls);
                }
            }
            stepHTML += "</span>";
            //const typesHTML = "★発動予定タイプ：" + triggeredTypes.map(cls => `<i class="ticon ${cls}"></i>`).join("");
            this.$subtypes.html(stepHTML);
            //this.$triggeredTypes.html(typesHTML);
        }

        getSelectedMainTypeClass() {
            const val = $("#s_type").val();
            if (!val) {
                return null;
            }
            return "type" + val;
        }
    }

    class Utils {
        static enableskillCountInfo() {
            const delayer = new Delayer();
            $(document.head).append("<style type='text/css'>.skillcount{ display: inline-block; width: 2em; text-align: center; }.skillrank{ display: inline-block; width: 2.5em; text-align: center; }</style>");

            function reloadSkill() {
                delayer.setDelay(() => {
                    $(".selskill").each((i, e) => {
                        const $targetSkillDesc = $(e).next(/*desc*/);

                        const skillId = $(e).val();
                        const $desc = $("#desc" + skillId);
                        if (!$desc.length) {
                            $targetSkillDesc.html("").attr("title", "");
                            return;
                        }

                        const $descClone = $desc.children().clone(true);
                        const $hoverDesc = $desc.children(".skillhoverdesc");

                        const stype = $("#type" + skillId).html();
                        const $countLeftTd = $desc.next("td");
                        let scount = "";
                        if ($countLeftTd.children().length === 1) {
                            const $countLeftClone = $countLeftTd.clone();
                            $countLeftClone.children().html("[" + $countLeftClone.children().html() + "]");
                            scount = $countLeftClone.html();
                        } else {
                            scount = "[" + $countLeftTd.html() + "]";
                        }
                        scount = `<span class="skillcount">${scount}</span>`;

                        const srank = `<span class="skillrank">(${$countLeftTd.next("td").contents().eq(1).text()})</span>`;

                        $targetSkillDesc.html(scount + srank + stype).append($descClone).attr("title", $hoverDesc.text());
                    });
                }, 100);
            };

            window.reloadSkill = reloadSkill;
            window.reloadSkill();
        }
    }

    class TextIO {
        constructor(mime) {
            this.mime = mime || "text/plain";
        }

        init() {
            const ths = this;
            this.$dlAnchor = $("<a/>").css("display", "none").appendTo(document.body);
            this.$dlButton = $("<input type='file'>")
                .attr("accept", this.mime)
                .css("display", "none")
                .appendTo(document.body);
        }

        export(content, filename) {
            const blob = new Blob([content], { type: this.mime });
            const file = new File([blob], filename);
            const anchorElem = this.$dlAnchor[0];
            // location.href =  URL.createObjectURL(file);
            anchorElem.href = URL.createObjectURL(file);
            anchorElem.download = filename;
            anchorElem.click();
        }

        async import() {
            return new Promise((resolve, reject) => {
                if (!this.$dlButton) {
                    reject("haven't initialized yet.");
                    return;
                }

                this.$dlButton.one("change", async function () {
                    try {
                        const files = this.files;
                        if (!files || files.length === 0) {
                            return;
                        }

                        const res = await new Response(files[0]);
                        const content = await res.text();
                        this.value = "";

                        resolve(content);
                    } catch {
                        reject("IO Exception maybe.");
                    }
                })[0].click();
            });

        }
    }

    class SkillItem {
        constructor(condId, skillId, skillName, iconUrl, serifBody) {
            this.condId = condId;
            this.skillId = skillId;
            this.skillName = skillName;
            this.iconUrl = iconUrl;
            this.serifBody = serifBody;
        }
    }

    class SkillSettingData {
        constructor(title, mainTypeId, columnId, skills, connectSkillId) {
            this.title = title;
            this.mainTypeId = mainTypeId;
            this.columnId = columnId;
            this.skills = skills;
            this.connectSkillId = connectSkillId;
        }
    }

    function selectOptionsToArray(select) {
        return $(select).children("option").map((i, e) => e.value).get();
    }

    function removeInvalidCharacterFromFilename(filename) {
        return filename.replace(/[<>:"\/\\|?*]/, "");
    }

    class SkillSettingElements {
        constructor() {
        }
        static query(/* optional */ context) {
            context = context || document;
            const obj = new SkillSettingElements();
            // 1 or 2; must validate
            obj.$column = $("select[name='line']", context);
            // default: empty
            obj.$mainType = $("#s_type", context);
            obj.$connectSkill = $("select[name='connectno']", context);

            obj.$skills = $("span.skilldesc", context).prev("select[name^=skill]");
            obj.$sconds = $("span.marks.marki0 + select[name^=scond]", context);
            obj.$icons = $("select[name^=icon]", context);
            obj.$serifs = $("input[type='text'][name^=serif]", context);

            if (!(obj.$mainType.length && obj.$column.length &&
                obj.$connectSkill.length &&
                obj.$skills.length && obj.$sconds.length &&
                obj.$icons.length && obj.$serifs.length)) {
                throw new Error("invalid operation: missedelement");
            }

            return obj;
        }
    }

    class SkillSettingForm {
        constructor() {
            const $obj = SkillSettingElements.query();

            this.skillsCount = $obj.$sconds.length;
            if (![$obj.$skills.length, $obj.$sconds.length, $obj.$icons.length, $obj.$serifs.length].every((x) => x === this.skillsCount)) {
                throw new Error("invalid operation: skillscount");
            }

            this.typeIds = new Set(selectOptionsToArray($obj.$mainType.eq(0)));
            this.conditionIds = new Set(selectOptionsToArray($obj.$sconds.eq(0)));
            this.skillIds = new Set(selectOptionsToArray($obj.$skills.eq(0)));
            this.iconUrls = new Set(selectOptionsToArray($obj.$icons.eq(0)));
        }

        apply(data) {
            const hasMissedAnySkills = this._applyDataIntoForm(data);
            this._triggerChangeEvents();
            if (hasMissedAnySkills) {
                return "一部スキルが存在しないため、設定を完全に復元することができませんでした。";
                shouldNotice = true;
            }
            return "";
        }

        buildData(title, /* optional */ context) {
            const $obj = SkillSettingElements.query(context);

            const columnId = $obj.$column.val();
            const mainTypeId = $obj.$mainType.val();
            const connectSkillId = $obj.$connectSkill.val();

            const skills = [];
            for (let si = 0; si < this.skillsCount; si++) {
                const $s = $obj.$skills.eq(si);
                const $sc = $obj.$sconds.eq(si);
                const $ic = $obj.$icons.eq(si);
                const $srf = $obj.$serifs.eq(si);
                const [condId, skillId, skillName, iconUrl, serifBody] = [$sc.val(), $s.val(), $s.children("option:selected").html(), $ic.val(), $srf.val()];
                skills.push(new SkillItem(condId, skillId, skillName, iconUrl, serifBody));
            }

            return new SkillSettingData(title, mainTypeId, columnId, skills, connectSkillId);
        }

        _applyDataIntoForm(data) {
            const errMessage = this._validateData(data);
            if (errMessage) {
                throw new Error(errMessage);
            }

            const $obj = SkillSettingElements.query();

            $obj.$column.val(data.columnId);
            $obj.$mainType.val(data.mainTypeId);
            $obj.$connectSkill.val(data.connectSkillId);

            const hasAnyMissedSkills = !data.skills.every(x => this.skillIds.has(x.skillId));

            for (let si = 0; si < this.skillsCount; si++) {
                if (si >= data.skills.length || !this.skillIds.has(data.skills[si].skillId)) {
                    // fillempty
                    $obj.$skills.eq(si).val("0");
                    $obj.$sconds.eq(si).val("0");
                    $obj.$serifs.eq(si).val("");
                    continue;
                }

                const skill = data.skills[si];
                $obj.$skills.eq(si).val(skill.skillId);
                $obj.$sconds.eq(si).val(skill.condId);
                $obj.$serifs.eq(si).val(skill.serifBody);
            }

            for (let si = 0; si < this.skillsCount; si++) {
                if (si >= data.skills.length || !this.skillIds.has(data.skills[si].skillId) || !this.iconUrls.has(data.skills[si].iconUrl)) {
                    // fillempty
                    $obj.$icons.eq(si).val("-1");
                } else {
                    $obj.$icons.eq(si).val(data.skills[si].iconUrl);
                }
            }

            return hasAnyMissedSkills;
        }

        _triggerChangeEvents() {
            const $obj = SkillSettingElements.query();

            $obj.$skills.each((i, e) => e.dispatchEvent(new Event("change")));
            $obj.$sconds.each((i, e) => e.dispatchEvent(new Event("change")));
            $obj.$serifs.each((i, e) => e.dispatchEvent(new Event("change")));
            $obj.$icons.each((i, e) => e.dispatchEvent(new Event("change")));
            $obj.$column[0].dispatchEvent(new Event("change"));
            $obj.$mainType[0].dispatchEvent(new Event("change"));
            $obj.$connectSkill[0].dispatchEvent(new Event("change"));
        }

        _validateData(data) {
            if (!data) {
                return "argument not given";
            }

            if (!["1", "2"].some(x => x === data.columnId)) {
                return "invalid column";
            }

            if (!data.skills || data.skills.length === 0 || data.skills.length > this.skillsCount) {
                return "invalid skills count";
            }

            if (!this.typeIds.has(data.mainTypeId)) {
                return "not-enabled type";
            }

            if (!data.skills.every(x => this.conditionIds.has(x.condId))) {
                return "not-enabled skill condition";
            }

            // if (!data.skills.every(x => this.skillIds.has(x.skillId))) {
            //     return "not owned skill";
            // }

            const connectSkillN = parseInt(data.connectSkillId || "0", 10);
            if (connectSkillN < 0 || connectSkillN > this.skillsCount) {
                return "invalid connect-skill";
            }

            return "";
        }

        _hasSkillId(id) {
            return this.skillIds.has(id)
        }
    }

    function dateToSixDigitsText(dat) {
        return dat.getFullYear().toString().slice(-2) + ("00" + (dat.getMonth() + 1)).slice(-2) + ("00" + dat.getDate()).slice(-2);
    }

    class SkillIO {
        static init() {
            SkillIO.io = new TextIO("application/json");
            SkillIO.io.init();

            $(document.head).append(
                `<style type='text/css'>
    h2.subtitle {
        position: relative;
    }

    .ssfileio {
        position: absolute;
        right: 0;
        bottom: 1px;
        width: 200px;
        font-size: 14px;
        text-align: center;
        color: #993300;
        background-color: #fffef8;
    }

    .ssexport {
        display: inline-block;
        margin: 0;
        width: 100px;
        background-color: #ffdd77;
        cursor: pointer;
    }

    .ssimport {
        display: inline-block;
        margin: 0;
        width: 100px;
        background-color: #bbddff;
        cursor: pointer;
    }
</style>`);
        }

        constructor(skillSetting) {
            this.skillSetting = skillSetting;
        }

        enable() {
            $("<div class='ssfileio'>戦闘設定のファイル管理<div class='ssexport'>出力(保存)</div><div class='ssimport'>入力</div></div>")
                .appendTo($("h2.subtitle").slice(0, 2));

            $(".ssexport").on("click", () => this.export());
            $(".ssimport").on("click", async () => await this.import());
        }

        async import() {
            let message;
            try {
                const json = await SkillIO.io.import();
                const data = JSON.parse(json);
                message = this.skillSetting.apply(data);
            } catch (e) {
                message = `入力に失敗しました。[${e.message || ""}]`;
            }

            if (message) {
                alert(message);
            }
        }

        export() {
            const dateText = dateToSixDigitsText(new Date());
            const title = prompt("保存する戦闘設定のタイトルを入力することができます。（オプション）", dateText);
            if (title === null) {
                return;
            }


            const data = this.skillSetting.buildData(title);
            const json = JSON.stringify(data, null, 4);
            const filename = `sgskill_${removeInvalidCharacterFromFilename(title) || dateText}.json`;
            SkillIO.io.export(json, filename);
        }
    }

    SkillSelectChaser.init();
    const $connectno = $("select[name='connectno']");
    if ($connectno.length !== 1) {
        return;
    }
    new SkillSelectChaser($connectno).enable();

    if ($("#skill1").length !== 1) {
        return;
    }
    SortableSkills.init();
    new SortableSkills($("div.divp > div.draggable-container.ui-sortable")).enable();

    SearchableSelect.init();
    new SearchableSelect($(".selskill")).enable();
    new SearchableSelect($("select[name='kouhai_base']")).enable();
    new SearchableSelect($("select[name='kouhai_mix']")).enable();
    $("select[name='kouhai_base']").add("select[name='kouhai_mix']").prev().css("margin-top", "-4px");
    new SearchableSelect($("select[name='stock_base']")).enable();

    SkillTypeCounter.init();
    new SkillTypeCounter().enable($("div.divp > div.draggable-container.ui-sortable"));

    SkillListMarker.init();
    new SkillListMarker($("table#skill")).enable($(".selskill"));

    Utils.enableskillCountInfo();

    const skillSetting = new SkillSettingForm();
    SkillIO.init()
    new SkillIO(skillSetting).enable();
})();
