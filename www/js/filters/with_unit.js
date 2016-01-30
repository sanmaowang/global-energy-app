// with_unit.js
(function() {
    angular.module('energy.filters')
        .filter('withUnit', withUnit);

    withUnit.$inject = [ '$filter' ];

    function withUnit($filter){
        return function(input, unit, precision){
            var precision = precision || 0;
            var parseFloat = window.parseFloat || Number.parseFloat;
            var output;
            if(typeof(input) == 'string'){
                output = parseFloat(input.replace(/,/gi, ''));
            }else{
                output = parseFloat(input);
            }
            if(unit == '万'){
                output = output / 10000;
                output = $filter('number')(output, precision);
                output = output + unit;
            }else if(unit == '亿'){
                output = output / 100000000;
                output = $filter('number')(output, precision);
                output = output + unit;
            }else{
                output = $filter('number')(output, precision);
            }
            return output;
        }
    }
})();