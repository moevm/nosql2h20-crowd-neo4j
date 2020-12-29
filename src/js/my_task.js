$(document).ready(()=>{
    $.ajax({
        url: '/get_task',
        data: { name: $('#task_name').text() },
        method: 'GET',
        success: (buf) => {
            $('#task_status').text('Статус: ' + buf['task_status']);
            $('#like_count').text('Лайки: ' + buf['like_count']);
            $('#description').text(buf['description']);
            $('#com_taskId').val(buf['taskId']);
            $('#sol_taskId').val(buf['taskId']);

            if(buf['task_status'] === 'close'){
                $('#new_comment').attr('style', 'display:none')
                $('#close_task').attr('style', 'display:none')
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
                if(buf['task_status'] !== 'close' && sol[i]['status'] !== 'confirmed')
                    card.append($('<div class="w3-center">').append($('<button class="w3-button w3-block w3-section w3-padding w3-round-xxlarge brown_b" onclick="confirm_solution(this)">').attr('name', sol[i]['solution_text']).text('Принять решение')))
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
function get_user_status(rating){
    if(rating >= 10)
        return 'Мыслитель'
    if(rating >= 5)
        return 'Опытный'
    return 'Новичок'
}
function confirm_solution(button){
    let solution_text = $(button).attr('name')

    if($('#close_task').attr('style') !== 'display:none'){
        $.ajax({
            url: '/confirm_solution',
            data: { solution_text: solution_text, name: $('#task_name').text()},
            method: 'GET',
            dataType: 'html',
            success: (html) => {
                this.document.write(html); // where 'html' is a variable containing your HTML
                this.document.close(); // to finish loading the page
            }
        })
    }
    else
        alert('Задание закрыто')
}

function close_task(){
    $.ajax({
        url: '/close_task',
        data: { name: $('#task_name').text() },
        method: 'GET',
        success: (buf) => {
            $('#close_task').attr('style', 'display:none')
            $('#new_comment').attr('style', 'display:none')
            $('#task_status').text('Статус: close');
        }
    })
}