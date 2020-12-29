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
    $.ajax({
        url: '/get_task',
        data: { name: $('#task_name').text() },
        method: 'GET',
        success: (buf) => {
            $('#task_status').text('Статус: ' + buf['task_status']);
            $('#like_count').text('  ' + buf['like_count']);
            $('#description').text(buf['description']);
            $('#com_taskId').val(buf['taskId']);
            $('#sol_taskId').val(buf['taskId']);

            if(buf['task_status'] === 'close'){
                $('#new_comment').attr('style', 'display:none')
                $('#new_solution').attr('style', 'display:none')
            }

            let sol = buf['solutions']
            for (let i = 0; i < sol.length; i++) {
                let name = $('<div class="w3-display-left">').append($('<p>').text(sol[i]['user_name']))
                let rating = $('<div class="w3-display-middle">').append($('<p>').text('Рейтинг: ' + sol[i]['rating']))
                let status = $('<div class="w3-display-right">').append($('<p>').text(get_user_status(sol[i]['rating'])))
                let header = $('<div class="w3-display-container" style="height: 30px">').append(name).append(rating).append(status)
                let solution = $('<div class="w3-center">').append($('<p>').text(sol[i]['solution_text']))
                let card = $('<div class="task_container task_card" style="margin-bottom: 10px">').append(header).append(solution)
                if(sol[i]['status'] === 'confirmed')
                    card.addClass('w3-green')
                $('#solutions_list').append(card)
            }

            let com = buf['comments']
            for (let i = 0; i < com.length; i++) {
                let name = $('<div class="w3-display-left">').append($('<p>').text(com[i]['user_name']))
                let rating = $('<div class="w3-display-middle">').append($('<p>').text('Рейтинг: ' + com[i]['rating']))
                let status = $('<div class="w3-display-right">').append($('<p>').text(get_user_status(com[i]['rating'])))
                let header = $('<div class="w3-display-container" style="height: 30px">').append(name).append(rating).append(status)
                let comment = $('<div class="w3-center">').append($('<p>').text(com[i]['comment_text']))
                let card = $('<div class="task_container task_card" style="margin-bottom: 10px">').append(header).append(comment)
                $('#comments_list').append(card)
            }
        }
    });
});