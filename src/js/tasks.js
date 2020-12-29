const filter = { search_request: '',
                 status_filter: {}};
let active_url = '/all_task_list'

function change_url(active){
    $('#all_task_list').removeClass('active-bar-item');
    $('#sol_by_me_task_list').removeClass('active-bar-item');
    $('#my_task_list').removeClass('active-bar-item');

    $(active).addClass('active-bar-item');
    active_url = '/' + active.id;
    all_task_list();
}

function concrete_task(div){
    let task_name = $(div).text()
    $.ajax({
        url: '/concrete_task',
        data: {name: task_name},
        method: 'GET',
        dataType: 'html',
        success: (html) => {
            this.document.write(html); // where 'html' is a variable containing your HTML
            this.document.close(); // to finish loading the page
            }
    })
}

function like(div){
    let task_name = $(div).attr('value')
    $.ajax({
        url: '/like',
        data: {name: task_name},
        method: 'GET',
        success: () => {
            let next = $(div).next()
            next.text('  ' + (Number.parseInt(next.text())+1))
        }
    })
}

function all_task_list(){
    filter.search_request = $('#search_input').val()
    $.ajax({
        url: active_url,
        data: filter,
        processData: true,
        method: 'GET',
        success: (buf) => {
            let task_list = $('#task_list');
            task_list.empty();
            for (let i = 0; i < buf.length; i++) {
                let task_name = $('<div>').append($('<h3 onclick="concrete_task(this)">').text(buf[i]["task_name"]));
                let description =  $('<div>').append($('<p>').text(buf[i]["description"]));
                let task_div = $('<div class="card_inline" style="width: 70%">').append(task_name).append(description);

                let task_status = $('<p>').text(buf[i]["task_status"]);
                let like_count = $('<span>').text('  ' + buf[i]["like_count"]);
                let like = $('<button onclick="like(this)">').html('&#10084;').attr('value', buf[i]["task_name"])
                let status_div = $('<div class="card_inline" style="width: 30%">').append($('<p>Статус:</p>')).append(task_status).append($('<p>Лайки:</p>'))

                if(!buf[i]['my_task'])
                    status_div.append(like)
                status_div.append(like_count);

                let card = $('<div class="task_container task_card" style="margin-bottom: 10px">').append(task_div).append(status_div);
                task_list.append(card);

                if(typeof filter["status_filter"][buf[i]["task_status"]] === 'undefined'){
                    filter["status_filter"][buf[i]["task_status"]] = true;
                    $('#task_filter').append($('<div>').append($('<input type="checkbox" checked onclick="filter[`status_filter`][this.value] = !filter[`status_filter`][this.value]; all_task_list()">').attr('value', buf[i]["task_status"])).append(buf[i]["task_status"]));
                }
            }
        }
    });
}

$(document).ready(()=>{
    $('#a_1').addClass('active-bar-item')
    all_task_list();
});
