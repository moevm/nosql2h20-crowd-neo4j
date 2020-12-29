$(document).ready(()=>{
    $('#a_2').addClass('active-bar-item')
    $.ajax({
        url: '/get_rating',
        method: 'GET',
        success: (buf) => {
            for (let i = 0; i < buf.length; i++) {
                let number = $('<div class="w3-display-left">').append($('<p>').text(buf[i]['number']))
                let name = $('<div class="w3-display-middle">').append($('<p>').text(buf[i]['user_name']))
                let rating = $('<div class="w3-display-right">').append($('<p>').text(buf[i]['rating']))
                let header = $('<div class="w3-display-container" style="height: 30px">').append(number).append(name).append(rating)

                let card = $('<div class="task_container task_card" style="margin-bottom: 10px">').append(header)
                $('#rating_list').append(card)
            }
        }
    });
});