const filter = {
    user_filter: {
        newbie: true,
        experienced : true,
        thinker: true
    },
    status_filter: {}
}

function get_filter(){
    $.ajax({
        url: '/get_filter',
        method: 'GET',
        success: (buf) => {
            for(let i = 0; i < buf.length; i++){
                filter['status_filter'][buf[i]] = true;
                $('#filter_list').append($('<div>').append($('<input type="checkbox" checked onclick="filter[`status_filter`][this.value] = !filter[`status_filter`][this.value]; get_statistics()">').attr('value', buf[i])).append(buf[i]));
            }
            get_statistics()
        }
    })
}

function get_statistics(){
    let user_filter = !$('#user_filter').prop("checked");
    let status_filter = !$('#status_filter').prop("checked");
    let clone = {}
    for(let key in filter.status_filter)
        clone[key] = filter.status_filter[key]
    let correct_filter = {
        user_filter: {
            newbie: user_filter ? true : filter.user_filter.newbie,
            experienced : user_filter ? true : filter.user_filter.experienced,
            thinker: user_filter ? true : filter.user_filter.thinker
        },
        status_filter: clone
    }
    let keys = Object.keys(correct_filter['status_filter']);
    for(const task_status of keys) {
        correct_filter['status_filter'][task_status] = status_filter ? true : correct_filter['status_filter'][task_status]
    }
    $.ajax({
        url: '/get_statistics',
        data: correct_filter,
        method: 'GET',
        success: (buf) => {
            $('#comments_count').text('Количество комментариев: ' + buf['comments_count'])
            $('#solutions_count').text('Количество отправленных решений: ' + buf['solutions_count'])
            $('#tasks_count').text('Количество опубликованных заданий: ' + buf['tasks_count'])
            $('#like_count').text('Количество лайков: ' + buf['like_count'])
        }
    })
}

$(document).ready(()=>{
    $('#a_4').addClass('active-bar-item')
    get_filter()
});