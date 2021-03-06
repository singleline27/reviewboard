RB = {};


/*
 * Creates a form dialog based on serialized form field data.
 * This will handle creating and managing a form dialog and posting the
 * resulting data to the server.
 *
 * options has the following fields:
 *
 *    action          - The action. Defaults to "."
 *    confirmLabel    - The label on the confirm button.
 *    fields          - The serialized field data.
 *    dataStoreObject - The object to edit or create.
 *    success         - The success function. By default, this reloads the page.
 *    title           - The form title.
 *    upload          - true if this is an upload form.
 *    width           - The optional set width of the form.
 *
 * options.fields is a dictionary with the following fields:
 *
 *    name      - The name of the field.
 *    hidden    - true if this is a hidden field.
 *    label     - The label tag for the field.
 *    required  - true if this field is required.
 *    help_text - Optional help text.
 *    widget    - The HTML for the field.
 *
 * @param {object} options  The options for the dialog.
 *
 * @return {jQuery} The form dialog.
 */
$.fn.formDlg = function(options) {
    options = $.extend({
        action: ".",
        confirmLabel: "Send",
        fields: {},
        dataStoreObject: null,
        success: function() { window.location.reload(); },
        title: "",
        upload: false,
        width: null
    }, options);

    return this.each(function() {
        var self = $(this),
            errors = $("<div/>")
                .addClass("error")
                .hide(),
            form = $("<form/>")
                .attr("action", options.action)
                .submit(function() {
                    send();
                    return false;
                })
                .append($("<table/>")
                    .append($("<colgroup/>")
                        .append('<col/>')
                        .append('<col/>')
                        .append('<col width="100%"/>'))
                    .append($("<tbody/>"))),
            tbody = $("tbody", form),
            fieldInfo = {},
            field,
            box,
            i;

        if (options.upload) {
            form.attr({
                encoding: "multipart/form-data",
                enctype:  "multipart/form-data"
            });
        }

        for (i = 0; i < options.fields.length; i++) {
            field = options.fields[i];
            fieldInfo[field.name] = {'field': field};

            if (field.hidden) {
                form.append($(field.widget));
            } else {
                fieldInfo[field.name].row =
                    $("<tr/>")
                        .appendTo(tbody)
                        .append($("<td/>")
                            .addClass("label")
                            .html(field.label))
                        .append($("<td/>")
                            .html(field.widget))
                        .append($("<td/>")
                            .append($("<ul/>")
                                .addClass("errorlist")
                                .hide()));

                if (field.required) {
                    $("label", fieldInfo[field.name].row)
                        .addClass("required");
                }

                if (field.help_text) {
                    $("<tr/>")
                        .appendTo(tbody)
                        .append("<td/>")
                        .append($("<td/>")
                            .addClass("help")
                            .attr("colspan", 2)
                            .text(field.help_text));
                }
            }
        }

        box = $("<div/>")
            .addClass("formdlg")
            .append(errors)
            .append(self)
            .append(form)
            .keypress(function(e) {
                e.stopPropagation();
            });

        if (options.width) {
            box.width(options.width);
        }

        box.modalBox({
            title: options.title,
            buttons: [
                $('<input type="button"/>')
                    .val(gettext("Cancel")),
                $('<input type="button"/>')
                    .val(options.confirmLabel)
                    .click(function() {
                        form.submit();
                        return false;
                    })
            ]
        });

        /*
         * Sends the form data to the server.
         */
        function send() {
            options.dataStoreObject.save({
                form: form,
                buttons: $("input:button", box.modalBox("buttons")),
                success: function(rsp) {
                    options.success(rsp);
                    box.remove();
                },
                error: function(rsp) { // error
                    displayErrors(rsp);
                }
            });
        }


        /*
         * Displays errors on the form.
         *
         * @param {object} rsp  The server response.
         */
        function displayErrors(rsp) {
            var errorStr,
                fieldName,
                list,
                i;

            if (_.isObject(rsp)) {
                errorStr = rsp.err.msg;

                if (options.dataStoreObject.getErrorString) {
                    errorStr = options.dataStoreObject.getErrorString(rsp);
                }
            } else {
                errorStr = rsp;
            }

            errors
                .html(errorStr)
                .show();

            if (rsp.fields) {
                /* Invalid form data */
                for (fieldName in rsp.fields) {
                    if (!fieldInfo[fieldName]) {
                        continue;
                    }

                    list = $(".errorlist", fieldInfo[fieldName].row)
                        .css("display", "block");

                    for (i = 0; i < rsp.fields[fieldName].length; i++) {
                        $("<li/>")
                            .appendTo(list)
                            .html(rsp.fields[fieldName][i]);
                    }
                }
            }
        }
    });
};


/*
 * Registers handlers for the toggleable stars.
 *
 * These will listen for when a star is clicked, which will toggle
 * whether an object is starred. Right now, we support "reviewrequests"
 * and "groups" types. Loads parameters from data attributes on the element.
 * Attaches at the document level so it applies to future stars.
 *
 * @param {string} object-type  The type used for constructing the path.
 * @param {string} object-id    The object ID to star/unstar.
 * @param {bool}   starred      The default value.
 */
function registerToggleStar() {
    $(document).on('click', '.star', function() {
        var self = $(this),
            obj = self.data("rb.obj"),
            type,
            objid,
            on,
            altTitle;

        if (!obj) {
            type = self.attr("data-object-type");
            objid = self.attr("data-object-id");

            if (type === "reviewrequests") {
                obj = new RB.ReviewRequest({
                    id: objid
                });
            } else if (type === "groups") {
                obj = new RB.ReviewGroup({
                    id: objid
                });
            } else {
                self.remove();
                return;
            }
        }

        on = (parseInt(self.attr("data-starred"), 10) === 1) ? 0 : 1;
        obj.setStarred(on);
        self.data("rb.obj", obj);

        altTitle = on ? gettext("Starred") : gettext("Click to star");

        if (on) {
            self
                .removeClass('rb-icon-star-off')
                .addClass('rb-icon-star-on');
        } else {
            self
                .removeClass('rb-icon-star-on')
                .addClass('rb-icon-star-off');
        }

        self.attr({
            'data-starred': on,
            title: altTitle
        });
    });
}

/*
 * The wrapper function of autocomplete for the search field.
 * Currently, quick search searches for users, groups, and review
 * requests through the usage of search resource.
 */
var SUMMARY_TRIM_LEN = 28;

$.fn.searchAutoComplete = function() {
    this.rbautocomplete({
        formatItem: function(data) {
            var s;

            if (data.username) {
                // For the format of users
                s = data.username;

                if (data.fullname) {
                    s += " <span>(" + _.escape(data.fullname) + ")</span>";
                }

            } else if (data.name) {
                // For the format of groups
                s = data.name;
                s += " <span>(" + _.escape(data.display_name) + ")</span>";
            } else if (data.summary) {
                // For the format of review requests
                if (data.summary.length < SUMMARY_TRIM_LEN) {
                    s = data.summary;
                } else {
                    s = data.summary.substring(0, SUMMARY_TRIM_LEN);
                }

                s += " <span>(" + _.escape(data.id) + ")</span>";
            }

            return s;
        },
        matchCase: false,
        multiple: false,
        clickToURL: true,
        selectFirst: false,
        width: 240,
        enterToURL: true,
        parse: function(data) {
            var jsonData = data,
                jsonDataSearch = jsonData.search,
                parsed = [],
                objects = ["users", "groups", "review_requests"],
                values = ["username", "name", "summary"],
                value,
                items,
                i,
                j;

            for (j = 0; j < objects.length; j++) {
                items = jsonDataSearch[objects[j]];

                for (i = 0; i < items.length; i++) {
                    value = items[i];

                    if (j !== 2) {
                        parsed.push({
                            data: value,
                            value: value[values[j]],
                            result: value[values[j]]
                        });
                    } else if (value['public']) {
                        // Only show review requests that are public
                        value.url = SITE_ROOT + "r/" + value.id;
                        parsed.push({
                            data: value,
                            value: value[values[j]],
                            result: value[values[j]]
                        });
                    }
                }
            }

            return parsed;
        },
        url: SITE_ROOT + "api/" + "search/"
    });
};

var gInfoBoxCache = {};

/*
 * Bug and user infoboxes. These are shown when hovering over links to users
 * and bugs.
 *
 * The infobox is displayed after a 1 second delay.
 */
$.fn.infobox = function(id) {
    var POPUP_DELAY_MS = 500,
        HIDE_DELAY_MS = 300,
        OFFSET_LEFT = -20,
        OFFSET_TOP = 10,
        $infobox = $('#' + id);

    if ($infobox.length === 0) {
        $infobox = $('<div/>')
            .attr('id', id)
            .hide();
        $(document.body).append($infobox);
    }

    function showInfobox(url, $target) {
        $infobox
            .empty()
            .addClass('loading')
            .html(gInfoBoxCache[url])
            .positionToSide($target, {
                side: 'tb',
                xOffset: OFFSET_LEFT,
                yDistance: OFFSET_TOP,
                fitOnScreen: true
            })
            .fadeIn();

        $infobox.find('.gravatar')
            .retinaGravatar();
    }

    function fetchInfobox(url, $target) {
        if (!gInfoBoxCache[url]) {
            $.get(url, function(responseText) {
                gInfoBoxCache[url] = responseText;
            }).done(function() {
                showInfobox(url, $target);
            });
        } else {
            showInfobox(url, $target);
        }
    }

    return this.each(function() {
        var $target = $(this),
            timeout = null,
            url = $target.attr('href') + 'infobox/';

        $target.on('mouseover', function() {
            timeout = setTimeout(function() {
                fetchInfobox(url, $target);
            }, POPUP_DELAY_MS);
        });

        $([$target[0], $infobox[0]]).on({
            mouseover: function() {
                if ($infobox.is(':visible')) {
                    clearTimeout(timeout);
                }
            },
            mouseout: function() {
                clearTimeout(timeout);

                if ($infobox.is(':visible')) {
                    timeout = setTimeout(function() {
                        $infobox.fadeOut();
                    }, HIDE_DELAY_MS);
                }
            }
        });
    });
};

$.fn.user_infobox = function() {
    $(this).infobox('user_infobox');
};

$.fn.bug_infobox = function() {
    $(this).infobox('bug_infobox');
};


$(document).ready(function() {
    $('<div id="activity-indicator" />')
        .text(gettext("Loading..."))
        .hide()
        .appendTo("body");

    $("#search_field").searchAutoComplete();
    $('.user').user_infobox();
    $('.bug').bug_infobox();
    $("time.timesince").timesince();

    $('.gravatar').retinaGravatar();

    registerToggleStar();
});

// vim: set et:sw=4:
