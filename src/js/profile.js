function get_user_status(rating){
    if(rating >= 10)
        return 'Мыслитель'
    if(rating >= 5)
        return 'Опытный'
    return 'Новичок'
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

$(document).ready(()=>{
    $('#a_3').addClass('active-bar-item')
    $.ajax({
        url: '/get_profile',
        data: {userId: $('#userId').text()},
        method: 'GET',
        success: (buf) => {
            $('#user_name').text(buf['user_name'])
            $('#rating').text('Рейтинг: ' + buf['rating'])
            $('#status').text('Статус: ' + get_user_status(buf['rating']))

            let list = buf['task_list']
            for (let i = 0; i < list.length; i++) {
                let task_name = $('<div>').append($('<h3 onclick="concrete_task(this)">').text(list[i]["task_name"]));
                let description =  $('<div>').append($('<p>').text(list[i]["description"]));
                let task_div = $('<div class="card_inline" style="width: 70%">').append(task_name).append(description);

                let task_status = $('<p>').text(list[i]["task_status"]);
                let like_count = $('<span>').text('  ' + list[i]["like_count"]);
                let status_div = $('<div class="card_inline" style="width: 30%">').append($('<p>Статус:</p>')).append(task_status).append($('<p>Лайки:</p>'))

                let like = $('<button onclick="like(this)">').html('&#10084;').attr('value', list[i]["task_name"])
                if(!list[i]['my_task'])
                    status_div.append(like)
                status_div.append(like_count);
                //Возможно также нужна кнопка лайка
                let card = $('<div class="task_container task_card" style="margin-bottom: 10px">').append(task_div).append(status_div);
                $('#sol_story').append(card);
            }
        }
    });
});
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