// develop2d.js
(function() {
    angular
        .module('energy.directives')
        .directive('develop2d', develop2d);
    function develop2d(){
        return {
            restrict: 'E',
            scope: {
                'data1' : '=data1',
                'data2' : '=data2',
                'data3' : '=data3',
                'data4' : '=data4',
                'data1Legend' : '=data1Legend'
            },
            link: function(scope, element){
                // 然后就可以动态加载图表进行绘制啦
                require([
                    'echarts',
                    'echarts/config',
                    'echarts/chart/map',
                ], renderMap2d);
                
                function renderMap2d(ec, ecConfig){
                    var chart = ec.init(element[0]);
                    var map_data = scope.data1;
                    var dataKey = scope.data1Legend;
                    var _min = scope.data2;
                    var _max = scope.data3;
                    var _sep = (_max-_min)/3;
                    var _years = scope.data4;
                    var _options = [];
                    var statAlias = {
                        'EN.ATM.CO2E.KT':'碳排放总量',
                        'NY.GDP.MKTP.CD' :'GDP',
                        'SP.POP.TOTL':'人口总量'
                    };
                    var _title = statAlias[dataKey];

                    for(var i = 0; i < _years.length; i++){
                        var _year = _years[i];
                        if(i == 0){
                            var _option_obj = {
                                title : {
                                    'text':_year +'年'+ _title,
                                    'x':'center',
                                    'y':30,
                                    'textStyle':{
                                      fontSize: 18,
                                      fontWeight: 'bolder',
                                      color: '#fff'
                                    }
                                },
                                dataRange: {
                                    min: _min,
                                    max : _max,
                                    color: ['#1e90ff','#f0ffff'],
                                    splitNumber: 5,
                                    x:'center',
                                    y:300,
                                    orient: 'horizontal',
                                    textStyle:{color:'#fff'},
                                    text:['高','低'],
                                },
                                series : [
                                    {
                                        'name':'GDP',
                                        'type': 'map',
                                        'mapType': 'world',
                                        'data': map_data[_year]
                                    }
                                ]
                            };
                        }else{
                            var _option_obj = {
                                title : {
                                    'text':_year +'年'+ _title,
                                },
                                series : [
                                    {'data': map_data[_year]}
                                ]
                            }
                        }
                        _options.push(_option_obj);
                    }

                    var option = {
                        timeline:{
                            data:_years,
                            x:'5%',
                            width:'90%',
                            y:320,
                            label : {
                                show: false,
                            },
                            controlPosition: 'left',
                            autoPlay : true,
                            lineStyle:{
                                color: '#333',
                                width: 1,
                                type: 'solid'
                            },
                            checkpointStyle:{
                                
                            },
                            controlStyle:{
                                itemSize: 12,
                                itemGap: 5,
                                normal : {
                                    color : '#ccc'
                                },
                                emphasis : {
                                    color : '#fff'
                                }
                            },                               
                            playInterval : 1500
                        },
                        options:_options
                    };
                    chart.setOption(option); 
                }
            } //link
        }
    }
})();