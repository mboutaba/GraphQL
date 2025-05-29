package main

import (
	//"encoding/json"
	"html/template"
	"log"
	"net/http"
	//"time"
	"main/handlers"
	//"github.com/golang-jwt/jwt/v5"
)

func main() {
	http.HandleFunc("/", serveLogin)

	http.HandleFunc("/home", handlers.HomeHandler)

	http.Handle("/js/", http.StripPrefix("/js/", http.FileServer(http.Dir("./js/"))))

	log.Println("Server started at :8080")

	http.ListenAndServe(":8080", nil)
}






func errorTemplate(w http.ResponseWriter, errorCode int, errorTitle, errorMessage string) {
	tmpl, err := template.ParseFiles("templates/error.html")
	if err != nil {
		// If we can't even parse the error template, fall back to plain text
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(errorCode)
	data := struct {
		Code    int
		Title   string
		Message string
	}{
		Code:    errorCode,
		Title:   errorTitle,
		Message: errorMessage,
	}

	tmpl.Execute(w, data)
}

func serveLogin(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {

		errorTemplate(w, http.StatusNotFound, "Page Not Found",
			"The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.")
		return
	}

	if r.Method == http.MethodGet {
		tmpl := template.Must(template.ParseFiles("templates/login.html"))
		tmpl.Execute(w, nil)
		return

	} else {

		errorTemplate(w, http.StatusMethodNotAllowed, "Method Not Allowed",
			"The requested method is not allowed for this resource.")
		return
	}
}
