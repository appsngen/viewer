$(function () {

    function classItemViewModel(name, params, returns, description, example) {
        this.name = ko.observable(name);
        this.returns = ko.observable(returns);
        this.description = ko.observable(description);
        this.example = ko.observable(example);

        var parameters = "";
        if (params) {
            parameters += "(";
            for (var i = 0; i < params.length; i++) {
                var p = params[i];
                if (p.type)
                    parameters += p.type + " ";
                if (p.name)
                    parameters += p.name;
                if (i < params.length - 1)
                    parameters += ", ";
            }
            parameters += ")";
        }

        this.params = ko.observable(parameters);
    };

    function classViewModel(name, description, items) {
        this.name = ko.observable(name);
        this.description = ko.observable(description);
        this.items = ko.observableArray(items ? items : []);
    };

    function docsViewModel() {
        var self = this;
        this.classes = ko.observableArray([]);
        this.selectedClass = ko.observable();

        this.selectClass = function (value, event) {
            self.selectedClass(value);
        };

        this.addClasses = function (classes) {

        }
    };

    var viewModel = new docsViewModel();

    $.ajax({
        url: 'data.json',
        dataType: 'json',
        success: function (doc) {
            var classes = {};
            for (var c in doc.classes) {
                classes[c] = new classViewModel(c, "");
            }

            for (var i = 0; i < doc.classitems.length; i++) {
                var item = doc.classitems[i];
                if (item.itemtype && item.name && classes[item.class])
                    classes[item.class].items.push(new classItemViewModel(item.name, item.params, "", item.description, ""));
            }

            for (var c in classes) {
                viewModel.classes.push(classes[c]);
            }
            if (viewModel.classes().length)
                viewModel.selectedClass(viewModel.classes()[0]);
        }
    });

    ko.applyBindings(viewModel, document.getElementById("appsNgenApiDoc"));

});