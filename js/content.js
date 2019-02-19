$(document).ready(function(){
	chrome.runtime.onMessage.addListener( function(request, sender, sendResponse) {
		var arr = [];

		if (request.method == "getURL") {
			sendResponse( { url: location.href, html: $("html").html(), error: arr } );
		}

		if ( request.method == "highlight" ) {
			var children = $("body").children();
			var c_regP = new RegExp("(" + request.pattern + ")", "gm");

			$(".highlight").contents().unwrap();

			children.find("script").remove();

			children.not("script,style").each(function(){
				body = $(this).html().replace( c_regP ,"<span class='highlight' style='background: orange;'>$1</span>");
				$(this).html(body);
			});
		}
	});
});