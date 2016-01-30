// map3d.js
(function() {
    angular
        .module('energy.directives')
        .directive('map3d', map3d);

    function map3d(){
        return {
            restrict: 'E',
            scope: {
                'onSelection' : '&onSelection',
                'chartRef' : '=chartRef'
            },
            link: function(scope, element){
                // 然后就可以动态加载图表进行绘制啦
                require([
                    'echarts',
                    'echarts/config',
                    'echarts-x',
                    // ECharts-X 中 map3d 的地图绘制基于 ECharts 中的 map。
                    'echarts/chart/map',
                    'echarts-x/chart/map3d'
                ], renderMap3d);

                function renderMap3d(ec, ecConfig){
                    var chart = ec.init(element[0]);
                    var onSelection = scope.onSelection;
                    var chatOptions = {
                        series: [{
                            type: 'map3d',
                            baseLayer: {
                                backgroundColor: 'rgba(0, 0, 0, 0.3)'
                            },
                            mapLocation: {
                                x: 0,
                                y: 0,
                                width: "100%",
                                height: "100%"
                            },
                            roam: {
                                autoRotate: true,
                                preserve: false
                            },
                            minZoom: 1,
                            maxZoom: 3,
                            // Empty data
                            data: [{}]
                        }]
                    };
                    chart.setOption(chatOptions);
                    chart.on(ecConfig.EVENT.CLICK, function(e){
                        onSelection({
                            $event: e
                        });
                    });
                    scope.chartRef.ref = chart;
                }
            }
        }
    }
})();