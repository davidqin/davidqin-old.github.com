$.log = function(msg) {
    console.log(msg);
}

var LuluGift = (function(){

    function LuluGift(){
        this.init_border();
        this.init_draggable_options();
        this.init_game_pool();
        this.init_drop_area();
    };

    LuluGift.prototype.init_border = function(){
        var index_list_1 = [2,6];
        var lis = $("#player").children("li");

        for(var i = 2; i < 100; i += 9)
            lis.eq(i).addClass("border_right");

        for(var i = 6; i < 100; i += 9)
            lis.eq(i).addClass("border_left");

        for(var i = 18; i < 18 + 9; i++)
            lis.eq(i).addClass("border_bottom");

        for(var i = 54; i < 54 + 9; i++)
            lis.eq(i).addClass("border_top");
    };

    LuluGift.prototype.init_draggable_options = function (){
        var options = [
            { number: 'A', bgcolor: "#C71585"         },
            { number: 'D', bgcolor: "#800080"         },
            { number: 'E', bgcolor: "#B8860B"         },
            { number: 'I', bgcolor: "rgb(0,0,128)"    },
            { number: 'L', bgcolor: "rgb(30,144,255)" },
            { number: 'O', bgcolor: "rgb(255,165,0)"  },
            { number: 'R', bgcolor: "hsl(0,75%,50%)"  },
            { number: 'U', bgcolor: "hsl(30,50%,50%)" },
            { number: 'V', bgcolor: "hsl(120,75%,38%)"}];

        options.forEach(function(key, index){
            var li = $('<li>').html(key.number)
                .css("backgroundColor", key.bgcolor)
                .attr("draggable", "true");

            li[0].addEventListener("dragstart", function(e) {
                e.dataTransfer.effectAllowed = "copyMove";
                e.dataTransfer.setData("text/plain", this.innerHTML);
                // $.log(this.innerHTML);
                [].forEach.call(document.querySelectorAll("#player .default"), function(item) {
                    // $.log(item);
                    item.classList.remove("default");
                    item.classList.add("ation");
                });
            }, false);

            li[0].addEventListener("dragend", function() {
                [].forEach.call(document.querySelectorAll("#player .ation"), function(item) {
                    item.classList.remove("ation");
                    item.classList.add("default");
                });
            }, false);

            $("#numberBox").append(li);
        });

    };

    LuluGift.prototype.build_word_space = function (item) {
        var li = $("<li>");
        li.addClass("fix");
        li.html(item);
        return li;
    };

    LuluGift.prototype.build_blank_space = function (index) {
        var li = $("<li>");

        li[0].classList.add("default");
            li.attr("draggable", "true");
            li.attr("index", index + 1);

            li[0].addEventListener("dragover", function(e) {
                if (e.preventDefault)  e.preventDefault();  // 不要执行与事件关联的默认动作
                if (e.stopPropagation) e.stopPropagation(); // 停止事件的传播
                return false;
            }, false);

            li[0].addEventListener("dragstart", function(e) {
                e.dataTransfer.effectAllowed = "copyMove";
                e.dataTransfer.setData("text/plain", $(this).attr("index"));
            }, false);

            li[0].addEventListener("drop", function(e) {
                if (e.preventDefault)  e.preventDefault();  // 不要执行与事件关联的默认动作
                if (e.stopPropagation) e.stopPropagation(); // 停止事件的传播

                var sendData = e.dataTransfer.getData("text/plain");
                // 获得 #player > li 矩阵数组
                var matrix    = Array.prototype.slice.call(document.querySelectorAll("#player>li"));
                var currIndex = matrix.indexOf(this);       // 获得当前元素的位置
                var rowIndex  = currIndex - currIndex % 9;  // 行开始的位置
                var colIndex  = currIndex % 9;              // 列开始的位置

                for (var i = rowIndex; i < rowIndex + 9; i++) {
                    if (i != currIndex && matrix[i].innerHTML == sendData) {
                        alert("行上有字母重复啦David哥哥");
                        return;
                    }
                }

                for (var i = colIndex; i < 81; i = i + 9) {
                    if (i != currIndex && matrix[i].innerHTML == sendData) {
                        alert("列上有字母重复啦David哥哥");
                        return;
                    }
                }

                if(parseInt(sendData)) return;

                this.innerHTML = sendData;

                var $player_li = $("#player").find("li"), i = 0, li_len = 0;
                for(i = 0, li_len = $player_li.length; i < li_len; i++){
                    var $temp_li = $player_li.eq(i);
                    if(!$temp_li.html()) break;
                }

                if(i >= li_len){
                    $("#finish").show();
                }

            }, false);
        return li;
    };

    LuluGift.prototype.init_game_pool = function(){
        var _this = this;

        "0ADILVRU00OVUAREL00RL0O0AV00D0A0O0I00V0EDI0R00UI0V0DA00EUO0ALD00LRVEUIO00IOLRDUE0".split("").forEach(function(item, index) {
            var li;

            if (item != "0")
                li = _this.build_word_space(item);
            else
                li = _this.build_blank_space(index);

            $("#player").append(li);
        });
    };

    LuluGift.prototype.init_drop_area = function(){
        var $trash = $("#trash");
        $player_li = $("#player").find("li");
        $trash[0].addEventListener('drop', function(e){
            var sendData = e.dataTransfer.getData("text/plain");
            //alert(sendData);
            var num = parseInt(sendData);
            if(num){
                $player_li.eq(num - 1).html('');
            }
            //alert(0);
        },false);

        $trash[0].addEventListener('dragover', function(e){
            if (e.preventDefault) {
                e.preventDefault(); //不要执行与事件关联的默认动作
            }

            if (e.stopPropagation) {
                e.stopPropagation(); //停止事件的传播
            }

            $.log(e);
            return false;
        }, false);
    };

    return LuluGift;

})();

$(function(){
    new LuluGift();
});