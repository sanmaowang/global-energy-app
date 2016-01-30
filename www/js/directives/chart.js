// chart.js
(function() {
    angular
        .module('energy.directives')
        .directive('chart', chart);

    function chart(){
        return {
            restrict: 'E',
            scope: {
                'chartTitle' : '=chartTitle',
                'data1' : '=data1',
                'data1Legend' : '=data1Legend',
                'data2' : '=data2',
                'data2Legend' : '=data2Legend',
                'labels' : '=labels'
            },
            link: function(scope, element){
                require([
                    'echarts',
                    'echarts/chart/bar'
                ], renderChart);

                function renderChart(ec){
                    // function initChart(){
                        var MAX_INITIAL_ZOOMED_ITEMS = 10;
                        var myChart = ec.init(element[0]);
                        var data1Legend = scope.data1Legend;
                        var data2Legend = scope.data2Legend;
                        var data1 = scope.data1;
                        var data2 = scope.data2;
                        var labels = scope.labels;
                        var chartTitle = scope.chartTitle;
                        console.log('renderChart labels', scope.labels);
                        console.log('renderChart data1', scope.data1);
                        console.log('renderChart data2', scope.data2);
                        console.log('renderChart data1Legend', scope.data1Legend);
                        console.log('renderChart data2Legend', scope.data2Legend);

                        var dataLength = labels.length;
                        var zoomStart = 0;
                        var zoomEnd = 100;
                        if(dataLength > MAX_INITIAL_ZOOMED_ITEMS){
                            var displayPercentage = MAX_INITIAL_ZOOMED_ITEMS / dataLength * 100;
                            zoomStart = 100 - displayPercentage;
                        }
                        var option = {
                            title : {
                                text: chartTitle
                            },
                            legend: {
                                data:[data1Legend,data2Legend],
                                y: 'bottom'
                            },
                            toolbox: {
                                show : false
                            },
                            grid: {
                                x: 60,
                                y: 80,
                                x2: 10,
                                y2: 60
                            }, 
                            dataZoom : {
                                show : true,
                                realtime : true,
                                //orient: 'vertical',   // 'horizontal'
                                //x: 0,
                                y: 36,
                                //width: 400,
                                height: 40,
                                //backgroundColor: 'rgba(221,160,221,0.5)',
                                //dataBackgroundColor: 'rgba(138,43,226,0.5)',
                                //fillerColor: 'rgba(38,143,26,0.6)',
                                //handleColor: 'rgba(128,43,16,0.8)',
                                //xAxisIndex:[],
                                //yAxisIndex:[],
                                start : zoomStart,
                                end : zoomEnd
                            },
                            xAxis : [
                                {
                                    type : 'category',
                                    data : labels,
                                    // data : ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
                                    axisLabel: {
                                        interval: 0
                                    },
                                    axisLine : {
                                        show: true,
                                        lineStyle: {
                                            color: '#ccc',
                                            type: 'solid',
                                            width: 1
                                        }
                                    },
                                    axisTick : {    // 轴标记
                                        show:true,
                                        length: 10,
                                        lineStyle: {
                                            color: '#ccc',
                                            type: 'solid',
                                            width: 1
                                        }
                                    }
                                }
                            ],
                            yAxis : [
                                {
                                    type : 'value',
                                    axisLine : {
                                        show: true,
                                        lineStyle: {
                                            color: '#ccc',
                                            type: 'solid',
                                            width: 1
                                        }
                                    }
                                }
                            ],
                            series : [
                                {
                                    name:data1Legend,
                                    type:'bar',
                                    data:data1,
                                    // data:[2.0, 4.9, 7.0, 23.2, 25.6, 76.7, 135.6, 162.2, 32.6, 20.0, 6.4, 3.3],
                                    itemStyle: {
                                        normal: {
                                            color: '#F1F1F1',
                                            barBorderColor: '#E2E2E2',
                                            barBorderWidth: 1
                                        },
                                        emphasis: {
                                            color: '#F1F1F1',
                                            barBorderColor: '#E2E2E2',
                                            barBorderWidth: 1
                                        }
                                    }
                                },
                                {
                                    name:data2Legend,
                                    type:'bar',
                                    data:data2,
                                    // data:[2.6, 5.9, 9.0, 26.4, 28.7, 70.7, 175.6, 182.2, 48.7, 18.8, 6.0, 2.3],
                                    itemStyle: {
                                        normal: {
                                            color: '#D2E2E9',
                                            barBorderColor: '#A9BFC6',
                                            barBorderWidth: 1
                                        },
                                        emphasis: {
                                            color: '#D2E2E9',
                                            barBorderColor: '#A9BFC6',
                                            barBorderWidth: 1
                                        }
                                    }
                                }
                            ]
                        };
                        myChart.setOption(option);
                    // }
                }
            }
        }
    }
})();