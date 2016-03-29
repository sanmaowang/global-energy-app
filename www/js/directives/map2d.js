// map2d.js
(function() {
    angular
        .module('energy.directives')
        .directive('map2d', map2d);
    function mapData(arr) {
        var newArr = [];
        for(var i = 0; i < arr.length; i++){
          var obj = {};
          obj.name = arr[i].name_english;
          obj.selected = true;
          newArr.push(obj);
        }
        return newArr;
    };
    function map2d(){
        return {
            restrict: 'E',
            scope: {
                'data1' : '=data1',
                'data1Legend' : '=data1Legend',
                'data2' : '=data2',
                'data3' : '=data3',
                'data2Legend' : '=data2Legend'
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
                    scope.$watch('data3',function(){
                        if(scope.data3){
                            var members1 = scope.data1;
                            var members2 = scope.data2;
                            var members3 = scope.data3;
                            var name1 = scope.data1Legend;
                            var name2 = scope.data2Legend;
                            var option = {
                                title : {
                                    show:'false'
                                },
                                backgroundColor:'#404a59',
                                series : [
                                    {
                                        name: "3",
                                        type: 'map',
                                        mapType: 'world',
                                        roam: false,
                                        itemStyle:{
                                            normal:{areaStyle:{color:'rgba(50,60,72,100)'}},
                                            emphasis:{label:{show:false},areaStyle:{color:'#639E2E'} }
                                        },
                                        z:3,
                                        zlevel:1,
                                        data:mapData(members3)
                                    },
                                    {
                                        name: name2,
                                        type: 'map',
                                        mapType: 'world',
                                        roam: false,
                                        itemStyle:{
                                            normal:{areaStyle:{color:'rgba(50,60,72,100)'}},
                                            emphasis:{label:{show:false},areaStyle:{color:'#F6AB20'} }
                                        },
                                        z:3,
                                        data:mapData(members2)
                                    },
                                    {
                                        name: name1,
                                        type: 'map',
                                        mapType: 'world',
                                        roam: false,
                                        itemStyle:{
                                            normal:{areaStyle:{color:'rgba(50,60,72,100)'}},
                                            emphasis:{label:{show:false},areaStyle:{color:'#B23D3F'} }
                                        },
                                        z:2,
                                        data:mapData(members1)
                                    }
                                    
                                ]
                            };
                            chart.setOption(option); 
                        }
                    },true);

                }
            } //link
        }
    }
})();