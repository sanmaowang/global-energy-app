// app.js
(function() {
    angular
        .module('energy', [
            'ionic',
            'ngAnimate',
            'energy.services',
            'energy.directives',
            'energy.filters',
            'energy.controllers',
        ])
        .constant('LOCAL_STORAGE_KEY_APP_INIT' , 'APP_INIT')
        .run(runBlock);

    runBlock.$inject = ['LOCAL_STORAGE_KEY_APP_INIT', '$localStorage', '$dataLoader', '$window', '$timeout', '$ionicPlatform', '$ionicLoading'];

    function runBlock(LOCAL_STORAGE_KEY_APP_INIT, $localStorage, $dataLoader, $window, $timeout, $ionicPlatform, $ionicLoading){

        // 配置echarts
        require.config({
            paths: {
                'echarts': 'lib/echarts',
                'echarts-x': 'lib/echarts-x'
            }
        });

        $ionicPlatform.ready(platformReady);

        function platformReady() {
            if(window.cordova && window.cordova.plugins.Keyboard) {
                // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
                // for form inputs)
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

                // Don't remove this line unless you know what you are doing. It stops the viewport
                // from snapping when text inputs are focused. Ionic handles this internally for
                // a much nicer keyboard experience.
                cordova.plugins.Keyboard.disableScroll(true);
            }

            if(!$localStorage[LOCAL_STORAGE_KEY_APP_INIT]){
                showLoading();
                $dataLoader.setListener(onLoaderMessage);
                $dataLoader.startLoading();
            }
        }

        function showLoading(){
            $ionicLoading.show({
                template: "正在加载数据..."
            });
        }
        function hideLoading(){
            $ionicLoading.hide();
        }

        function onLoaderMessage(result){
            if(result = 'done'){
                console.log('loader has finished');
                $localStorage[LOCAL_STORAGE_KEY_APP_INIT] = true;
                hideLoading();

                // Restart for sql data to be committed
                $timeout(function(){
                    window.location.reload();
                }, 300, false)
            }
        }
    }

})();